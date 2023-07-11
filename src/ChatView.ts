import { ItemView, Notice, WorkspaceLeaf, MarkdownRenderer, MarkdownView } from "obsidian"
import AiAssistantPlugin from "./main";


export const VIEW_TYPE_EXAMPLE = "ai-chat-view";

export class ChatView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "AI Chat View";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		const wrapper = container.createDiv("obsidian-ai-assistant");
		wrapper.createDiv('').createEl('ul',{cls : "obsidian-ai-assistant__history"});
		// wrapper.createDiv("obsidian-ai-assistant__spacer");
		
		const line = wrapper.createDiv("obsidian-ai-assistant__input-line");
		const input = line.createEl("textarea", {
			type: "textarea",
			placeholder: "Ask the AI something....",
			attr: { wrap: "hard", rows: 3 },
		});
		input.addEventListener('keyup', async (event) => {

			if (event.key == 'Enter') {
				const prompt = input.value;
				const plg = this.getPlugin();
				const key = `${plg.settings.metaKey}`;
				const value = event[key];
				
				if (
					plg.settings.sendOnEnter  || 
					value
					
					) {
						event.preventDefault();
						this.addPromptToHistory(prompt);
						input.value = "";
						input.focus();
						const {answer, error} = await plg.promptAIAPI(prompt);
						if (answer) {this.addAIResponseToHistory(answer)};
						if (error) {
							new Notice(error)
						}

					}
				}
		})
		this.addPromptToHistory('Hello There');
		this.addAIResponseToHistory("Hey")
	}


	addLineToHistory(content: string, type: string, prefix?: string) {
		const history = this.containerEl.getElementsByClassName(
			"obsidian-ai-assistant__history"
		)[0];
		const newEle = history.createEl('li',{ cls : 
			`obsidian-ai-assistant__history__${type} obsidian-ai-assistant__history__line`
	});
		// newEle.append(history.createSpan({cls : "obsidian-ai-assistant__history__line__prefix" , text : prefix || `(${new Date().toLocaleTimeString()}): `}));
		const h = new Date().getHours();
		const m = new Date().getMinutes();
		const strg = `${h < 10?'0':''}${h}:${m < 10?'0':''}${m}`
		newEle.createEl('div',{cls : 'timestamp', text : strg});
		const span = newEle.createEl('div');
		newEle.addEventListener('dblclick', () => {new Notice('Copied Content to Clipboard'),navigator.clipboard.writeText(content)})
		
		const view = this.app.workspace.getActiveViewOfType(
			MarkdownView
		) as MarkdownView;
		
		MarkdownRenderer.renderMarkdown(content, span, '', view);
		// if (type === 'prompt') {
		//   newEle.createSpan({text: prefix + content});
		// } else {

		// }
	}
	getPlugin(): AiAssistantPlugin {
		return app.plugins.getPlugin("ai-assistant");
	}
	addPromptToHistory(prompt: string) {
		this.addLineToHistory(
			prompt,
			"prompt"
		);
	}

	addAIResponseToHistory(response: string) {
		this.addLineToHistory(
			response,
			"ai-response"
		);
	}

	async onClose() {
		// Nothing to clean up.
	}
}
