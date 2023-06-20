import * as vscode from 'vscode';
import axios from 'axios';

let disposable: vscode.Disposable;

export function activate(context: vscode.ExtensionContext) {
  disposable = vscode.commands.registerCommand('extension.sendLineToApi', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const line = editor.document.lineAt(editor.selection.active.line).text.trim();
      await sendLineToApi(line);
    }
  });

  context.subscriptions.push(disposable);
}

async function sendLineToApi(line: string) {
  const endpoint = vscode.workspace.getConfiguration().get('lineToApi.endpoint') as string;

  try {
    const data = {
      inputs: line,
      parameters: {
        max_new_tokens: 10
      }
    };

    const response = await axios.post(endpoint, data);
    const generatedText = response.data.generated_text;
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      const currentPosition = editor.selection.active;
      editor.edit((editBuilder) => {
        const newPosition = currentPosition.with(currentPosition.line + 1, 0);
        editBuilder.insert(newPosition, generatedText);
      });
      vscode.window.showInformationMessage('Line sent to API successfully.');
      console.log(response.data);
    }
  } catch (error) {
    vscode.window.showErrorMessage('Failed to send line to API.');
    console.error(error);
  }
}
