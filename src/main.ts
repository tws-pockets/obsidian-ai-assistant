import {
	Editor,
	Notice,
	Plugin,
} from "obsidian";
import {  ImageModal, PromptModal, SpeechModal } from "./modal";
import { OpenAI } from "./openai_api";
import AiAssistantSettingTab, {AiAssistantSettings} from './AiAssistantSettings'
import { ChatView } from "./ChatView";

const DEFAULT_SETTINGS: AiAssistantSettings = {
	apiKey: "",
	modelName: "gpt-3.5-turbo",
	maxTokens: 500,
	replaceSelection: true,
	alwaysShowPromptWithAnswer : false,
	promptPrefix : [],
	// Chat Behaviour
	alwaysSaveChatHistory : true,
	chatHistoryPath : "/ai/history/",
	chatHistoryTemplate :  "",
	chatPrefix : [],
	sendOnEnter : false,
	metaKey : "ctrlKey",
	imgFolder: "AiAssistant/Assets",
	language: "",
};



export default class AiAssistantPlugin extends Plugin {
	settings: AiAssistantSettings;
	openai: OpenAI;
	isQuerying : boolean;

	build_api() {
		this.openai = new OpenAI(
			this.settings.apiKey,
			this.settings.modelName,
			this.settings.maxTokens
		);
	}
	togglePrompt(){
		const wrapper = this.app.workspace.getLeaf().view.containerEl.find('.ai-assistant__wrapper')
		if (wrapper) {
			wrapper.detach();
		}else {

			this.showPrompt()
		}
	}
	showPrompt(){
		console.error("ASD"); new Notice("Hey There", 1200)
		const activeLeaf = this.app.workspace.getLeaf();
		if (activeLeaf.view.containerEl.find('.ai-assistant__wrapper')) return;
		const wrapper = document.createElement('div')
		wrapper.addClass('ai-assistant__wrapper')
		const inputRow = wrapper.createDiv('input-row');
		const sendRow = wrapper.createDiv('send-row');
		const cell = sendRow.createDiv();

		const input = inputRow.createEl('textarea');

		input.setAttrs({

			rows : 5,
			autogrow : true

		})
		input.addEventListener('keyup',(event) => {
			console.log(`${event.key}`, {event})
			
			if (event.key === 'Enter' && event.ctrlKey) {
				event.preventDefault();
				button.disabled = true;
				input.disabled = true;
				this.promptAIAPI(input.value).then((answer) => {
					let template = ``;
					if (this.settings.alwaysShowPromptWithAnswer) {
						template = `Prompt: ${answer.prompt}\n Answer: ${answer.answer}`
					} else {
						template = answer.answer
					}
					this.app.workspace.activeEditor?.editor?.replaceSelection(template)
					wrapper.detach();
					
				}).catch(err => {
					new Notice("Querying Failed")
					button.disabled = false;
					input.disabled = false;
				})
			}
		})
		const button = cell.createEl('button');
		button.innerText = "Send"
		button.addEventListener('click',() => {
			button.disabled = true;
			input.disabled = true;
			this.promptAIAPI(input.value).then((answer) => {
				let template = ``;
				if (this.settings.alwaysShowPromptWithAnswer) {
					template = `Prompt: ${answer.prompt}\n Answer: ${answer.answer}`
				} else {
					template = answer.answer
				}
				this.app.workspace.activeEditor?.editor?.replaceSelection(template)
				wrapper.detach();
				
			}).catch((err) => {
				new Notice('Quering Failed')
				input.disabled = false;
				button.disabled = false; 
			})
		})
		activeLeaf.view.containerEl.append(wrapper);
		
		input.focus();
	}

	showChatView(){

	}

	
	async promptAIAPI(prompt : string) {
		const result = new Notice('Querying ChatGPT...',  50000);
		
		this.isQuerying = true;
		let answer = await this.openai.api_call([
			...this.settings.promptPrefix.filter(({active})=>active).map(({content ,role}) => ({
				content,
				role
			})),
			{
				role: "user",
				content: prompt
			},
		]);
		result.hide();
		this.isQuerying = false;
		answer = answer!;

		return {
			prompt,
			answer
		}

	}

	async onload() {
		await this.loadSettings();
		this.build_api();
    this.registerView(
      'ai-chat-view',
      (leaf) => new ChatView(leaf)
    );

		this.addCommand({
			id: "chat-mode",
			name: "Open Assistant Chat",
			callback: () => {
				this.activateView()
				

				// new ChatModal(this.app, this.openai).open();
			},
		});

		this.addCommand({
			id: "prompt-mode",
			name: "Open Assistant Prompt",
			callback : () => {
				
				this.togglePrompt();
			}
			// editorCallback: async (editor: Editor) => {
				
			// 	const selected_text = editor.getSelection().toString().trim();
			// 	new PromptModal(
			// 		this.app,
			// 		async (x: { [key: string]: string }) => {
			// 			let answer = await this.openai.api_call([
			// 				{
			// 					role: "user",
			// 					content:
			// 						x["prompt_text"] + " : " + selected_text,
			// 				},
			// 			]);
			// 			answer = answer!;
			// 			if (!this.settings.replaceSelection) {
			// 				answer = selected_text + "\n" + answer.trim();
			// 			}
			// 			if (answer) {
			// 				editor.replaceSelection(answer.trim());
			// 			}
			// 		},
			// 		false
			// 	).open();
			// },
		});

		this.addCommand({
			id: "img-generator",
			name: "Open Image Generator",
			editorCallback: async (editor: Editor) => {
				new PromptModal(
					this.app,
					async (prompt: { [key: string]: string }) => {
						const answer = await this.openai.img_api_call(
							prompt["prompt_text"],
							prompt["img_size"],
							parseInt(prompt["num_img"])
						);
						if (answer) {
							const imageModal = new ImageModal(
								this.app,
								answer,
								prompt["prompt_text"],
								this.settings.imgFolder
							);
							imageModal.open();
						}
					},
					true
				).open();
			},
		});

		this.addCommand({
			id: "speech-to-text",
			name: "Open Speech to Text",
			editorCallback: (editor: Editor) => {
				new SpeechModal(
					this.app,
					this.openai,
					this.settings.language,
					editor
				).open();
			},
		});

		this.addSettingTab(new AiAssistantSettingTab(this.app, this));
	}

	

	async activateView() {
    this.app.workspace.detachLeavesOfType('ai-chat-view');

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: 'ai-chat-view',
      active: true,
    });

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType('ai-chat-view')[0]
    );
  }
	onunload() {
		this.app.workspace.getLeaf().view.containerEl.find('.ai-assistant__wrapper')?.detach();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
