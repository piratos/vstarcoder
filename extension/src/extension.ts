import * as vscode from 'vscode';
import axios from 'axios';
import WebSocket from 'ws';

export function activate(context: vscode.ExtensionContext) {
  let disposableline = vscode.commands.registerCommand('extension.sendLineToApi', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const line = editor.document.lineAt(editor.selection.active.line).text.trim();
      await sendLineToApi(line);
    }
  });

  let disposableselection = vscode.commands.registerCommand('extension.sendSelectionToApi', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await sendSelectionToApi();
    }
  });

  context.subscriptions.push(disposableline);
  context.subscriptions.push(disposableselection);
}

async function insertTextAfterCurrentLine(text: string, after_selection: boolean = false) {
  console.log(text);
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    if (after_selection) {
      const selection = editor.selection;
      const endPosition = selection.end;
  
      await editor.edit((editBuilder) => {
        editBuilder.insert(endPosition, text);
      });
    }
    else {
      const line = editor.selection.active.line;
      const lineText = editor.document.lineAt(line).text;

      await new Promise<void>((resolve) => {
        editor.edit((editBuilder) => {
          editBuilder.insert(new vscode.Position(line + 1, 0), `${text}\n`);
        }).then(() => {
          resolve();
        });
      });
      const newPosition = new vscode.Position(line + 2, 0); // Move the cursor to the line after the pasted text
      const newSelection = new vscode.Selection(newPosition, newPosition);
      editor.selection = newSelection;
    }

  }
}


async function sendLineToApi(line: string) {
  const endpoint = vscode.workspace.getConfiguration().get('lineToApi.apiEndpoint') as string;
  const maxtokens = vscode.workspace.getConfiguration().get('lineToApi.maxTokens') as number;

  try {
    const data = {
      inputs: line,
      parameters: {
        max_new_tokens: maxtokens
      }
    };

    const response = await axios.post(endpoint, data);
    const generatedText = response.data.generated_text;
    insertTextAfterCurrentLine(generatedText);
    vscode.window.showInformationMessage('Line sent to API successfully.');
    console.log(response.data);
  } catch (error) {
    vscode.window.showErrorMessage('Failed to send line to API.');
    console.error(error);
  }
}


async function sendSelectionToApi() {
  const editor = vscode.window.activeTextEditor;
  const endpoint = vscode.workspace.getConfiguration().get('lineToApi.apiEndpoint') as string;
  const maxtokens = vscode.workspace.getConfiguration().get('lineToApi.maxTokens') as number;
  if (editor) {
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (selectedText) {
      try {
        const response = await axios.post(endpoint, {
          inputs: selectedText,
          parameters: {
            max_new_tokens: maxtokens
          }
        });

        const generatedText = response.data.generated_text;
        if (generatedText) {
          await insertTextAfterCurrentLine(generatedText, true);
        } else {
          vscode.window.showErrorMessage('Failed to generate text from API.');
        }
      } catch (error) {
        vscode.window.showErrorMessage('An error occurred while calling the API.');
      }
    } else {
      vscode.window.showErrorMessage('No text is selected.');
    }
  } else {
    vscode.window.showErrorMessage('No active text editor.');
  }
}