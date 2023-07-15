import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import AiAssistantPlugin from "./main";
import { openAIHistory } from "./openai_api";

/**
 * Settings Interface for this Plugin
 *
 */
export interface AiAssistantSettings {
	// chatGPT options
	apiKey: string;
	modelName: string;
	maxTokens: number;
	language: string;

	// Prompt Behaviour
	replaceSelection: boolean;
	alwaysShowPromptWithAnswer: boolean;
	promptPrefix: Array<openAIHistory>;

	// Chat Behaviour
	alwaysSaveChatHistory: boolean;
	chatHistoryPath: string; // should allow for yyyy-mm-dd/history
	chatHistoryTemplate: string; // should receive prompt and answer as vars
	chatPrefix: Array<openAIHistory>;
	sendOnEnter: boolean;
	metaKey: string;

	// Image generation
	imgFolder: string;
}

export default class AiAssistantSettingTab extends PluginSettingTab {
	plugin: AiAssistantPlugin;
	constructor(app: App, plugin: AiAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h1", { text: "AI Assistant Settings" });
		/**
		 *
		 * API Options
		 *
		 */
		containerEl.createEl("h3", { text: "API Options" });
		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Enter your OpenAI API Key")
			.addText((text) =>
				text
					.setPlaceholder("Enter your key here")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value: string) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
						this.plugin.build_api();
					})
			);

		/**
		 *
		 * Model Options
		 *
		 */
		containerEl.createEl("h3", { text: "Model Options" });
		new Setting(containerEl)
			.setName("ChatGPT Model Version")
			.setDesc("Select your model")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						"gpt-3.5-turbo": "gpt-3.5-turbo",
						"gpt-4": "gpt-4",
					})
					.setValue(this.plugin.settings.modelName)
					.onChange(async (value) => {
						this.plugin.settings.modelName = value;
						await this.plugin.saveSettings();
						this.plugin.build_api();
					})
			);

		new Setting(containerEl)
			.setName("Max Tokens")
			.setDesc("Select max number of generated tokens")
			.addText((text) =>
				text
					.setPlaceholder("Max tokens")
					.setValue(this.plugin.settings.maxTokens.toString())
					.onChange(async (value) => {
						const int_value = parseInt(value);
						if (!int_value || int_value <= 0) {
							new Notice("Error while parsing maxTokens ");
						} else {
							this.plugin.settings.maxTokens = int_value;
							await this.plugin.saveSettings();
							this.plugin.build_api();
						}
					})
			);

		/**
		 *
		 * Prompt Behaviour
		 *
		 */
		containerEl.createEl("h3", { text: "Prompt Behaviour" });

		new Setting(containerEl)
			.setName("Prompt behavior")
			.setDesc("Replace selection")
			.addToggle((toogle) => {
				toogle
					.setValue(this.plugin.settings.replaceSelection)
					.onChange(async (value) => {
						this.plugin.settings.replaceSelection = value;
						await this.plugin.saveSettings();
						this.plugin.build_api();
					});
			});

		new Setting(containerEl)
			.setName("Show Prompt with answer")
			.setDesc("If the prompt should be added to the note as well.")
			.addToggle((toggle) => {
				toggle.setValue(
					this.plugin.settings.alwaysShowPromptWithAnswer
				);
				toggle.onChange(async (state) => {
					this.plugin.settings.alwaysShowPromptWithAnswer = state;
					await this.plugin.saveSettings();
				});
			});
		const promptPrefix = new Setting(containerEl)
			.setName("Prompt Prefix")
			.setDesc("Set of Messages to put before every prompt.")
			.addButton((button) => {
				button.setIcon("plus-circle");
				button.setClass('clickable-icon');
				button.setClass('setting-editor-extra-setting-button')
				button.onClick(async (click) => {
					this.plugin.settings.promptPrefix.push({
						content: "",
						role: "user",
					});
					await this.plugin.saveSettings();
					this.display();
				});
			});

		const prefixContainer = containerEl.createDiv();
		// for each line in the history
		this.plugin.settings.promptPrefix.forEach((ele, idx, arr) => {
			// create a row
			const row = prefixContainer.createDiv('history__line');
			// create select option for role
			const select = row.createDiv('history__line__role').createEl("select");
			["user", "assistant", "system", "function"].forEach((option) => {
				select.createEl("option", { text: option });
			});
			select.value = ele.role;
			select.addEventListener('change',async () => {
				this.plugins.settings.promptPrefix[idx].role = select.value;
				await this.plugin.saveSettings();
			});
			// create text input for content
			const text = row.createDiv('history__line__message').createEl('textarea');
			text.value = ele.content;
			text.addEventListener('change', async  () => {
				this.plugin.settings.promptPrefix[idx].content = text.value;
				await this.plugin.saveSettings();
			});
			// create delete button
			const slider = row.createDiv();
			new Setting(slider).addToggle(toggle => {
				toggle.setValue(this.plugin.settings.promptPrefix[idx].active)
				toggle.onChange(async val =>{
					this.plugin.settings.promptPrefix[idx].active = val;
					await this.plugin.saveSettings();
				})

			})
			const button = row.createDiv('history__line__delete');
			new Setting(button).addButton(button => {
				button.setIcon('delete');
				button.setClass('clickable-icon');
				button.setClass('setting-editor-extra-setting-button')
				button.onClick(async (click) => {
					console.log(`Deleting ${idx} from settings `, {arr : this.plugin.settings.promptPrefix})
					this.plugin.settings.promptPrefix.splice(idx,1);
					await this.plugin.saveSettings();
					this.display();
				});
			})
		});
		/**
		 *
		 * Chat Behavior
		 *
		 */
		containerEl.createEl("h3", { text: "Chat Behaviour" });
		new Setting(containerEl)
			.setName("Store Chat History")
			.setDesc(
				"Wether to store the chat history with chatGPT in dedicated notes."
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.alwaysSaveChatHistory);
				toggle.onChange(async (state) => {
					this.plugin.settings.alwaysSaveChatHistory = state;
					await this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName("Chat History Location")
			.setDesc("Folder in which to store the history.")
			.addText((text) =>
				text
					.setPlaceholder("/ai/history/")
					.setValue(this.plugin.settings.chatHistoryPath)
					.onChange(async (value) => {
						const path = value.replace(/\/+$/, "");
						this.plugin.settings.chatHistoryPath = path;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Chat Message Template")
			.setDesc("Path to note template to use.")
			.addText((text) =>
				text
					.setPlaceholder("/ai/history/")
					.setValue(this.plugin.settings.chatHistoryPath)
					.onChange(async (value) => {
						const path = value.replace(/\/+$/, "");
						this.plugin.settings.chatHistoryPath = path;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Send on Enter")
			.setDesc(
				"Send Message upon hitting enter, rather than <meta>+enter"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.sendOnEnter);
				toggle.onChange(async (state) => {
					this.plugin.settings.sendOnEnter = state;
					await this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName("Meta Key to Use with Enter")
			.setDesc(
				"Select the meta key to trigger sending the message to the API."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						altKey: "alt",
						ctrlKey: "ctrl",
						metaKey: "meta",
						shiftKey: "shift",
					})
					.setValue(this.plugin.settings.metaKey)
					.onChange(async (value) => {
						this.plugin.settings.metaKey = value;
						await this.plugin.saveSettings();
					})
			);
		/**
		 *
		 * Image Assistant Options
		 *
		 */
		containerEl.createEl("h3", { text: "Image Assistant" });
		new Setting(containerEl)
			.setName("Default location for generated images")
			.setDesc("Where generated images are stored.")
			.addText((text) =>
				text
					.setPlaceholder("Enter the path to you image folder")
					.setValue(this.plugin.settings.imgFolder)
					.onChange(async (value) => {
						const path = value.replace(/\/+$/, "");
						if (path) {
							this.plugin.settings.imgFolder = path;
							await this.plugin.saveSettings();
						} else {
							new Notice("Image folder cannot be empty");
						}
					})
			);

		containerEl.createEl("h3", { text: "Speech to Text" });
		new Setting(containerEl)
			.setName("The language of the input audio")
			.setDesc("Using ISO-639-1 format (en, fr, de, ...)")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
