import { ItemView, WorkspaceLeaf } from "obsidian"

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
		wrapper.createEl('ul',{cls : "obsidian-ai-assistant__history"});
		// wrapper.createDiv("obsidian-ai-assistant__spacer");
		console.log("asd");
		const line = wrapper.createDiv("obsidian-ai-assistant__input-line");
		const input = line.createEl("textarea", {
			type: "textarea",
			placeholder: "Ask the AI something....",
			attr: { wrap: "hard", rows: 3 },
		});
		const button = line.createEl("button", "Send");
		button.addEventListener("click", (event) => {
			console.log("Received prompt", { event });
			
			const prompt = input.value;
			const plg = this.getPlugin();
			
			this.addPromptToHistory(prompt);
			input.value = "";
			plg.promptAIAPI(prompt)
				.then((resp : Object) => {
					if (resp?.error) {

					} else {

						this.addAIResponseToHistory(resp?.answer );
					}
				})
				.finally(() => {
				});
		});

	}

	addCopyAnswerIcon() {
		const wrapper = this.containerEl.createDiv("CopyAnswerIcon");
	}

	addLineToHistory(content: string, type: string, prefix?: string) {
		const history = this.containerEl.getElementsByClassName(
			"obsidian-ai-assistant__history"
		)[0];
		const newEle = history.createEl('li',{ cls : 
			`obsidian-ai-assistant__history__${type} obsidian-ai-assistant__history__line`
	});
		// newEle.append(history.createSpan({cls : "obsidian-ai-assistant__history__line__prefix" , text : prefix || `(${new Date().toLocaleTimeString()}): `}));
		const span = newEle.createSpan();
		span.innerHTML = prefix || '' + content;
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
