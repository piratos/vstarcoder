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

  let disposablecontext = vscode.commands.registerCommand('extension.sendContextToApi', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await sendContextToApi();
    }
  });
  context.subscriptions.push(disposableline);
  context.subscriptions.push(disposableselection);
  context.subscriptions.push(disposablecontext);
}

async function insertTextAfterCurrentLine(text: string, overwrite: boolean = false, after_selection: boolean = false) {
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

      await new Promise<void>((resolve) => {
        editor.edit((editBuilder) => {
          if (overwrite) {
            editBuilder.insert(new vscode.Position(line, 0), `${text}`);
          }
          else {
            editBuilder.insert(new vscode.Position(line + 1, 0), `${text}\n`);
          }
        }).then(() => {
          resolve();
        });
      });

      // Update cursor position
      let newPosition: vscode.Position;
      if (overwrite){
        newPosition = new vscode.Position(line, 0);
      }
      else {
        newPosition = new vscode.Position(line + 2, 0);
      }
      const newSelection = new vscode.Selection(newPosition, newPosition);
      editor.selection = newSelection;
    }

  }
}


async function sendLineToApi(line: string) {
  const endpoint = vscode.workspace.getConfiguration().get('vstarcoder.apiEndpoint') as string;
  const maxtokens = vscode.workspace.getConfiguration().get('vstarcoder.maxTokens') as number;

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
  const endpoint = vscode.workspace.getConfiguration().get('vstarcoder.apiEndpoint') as string;
  const maxtokens = vscode.workspace.getConfiguration().get('vstarcoder.maxTokens') as number;
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
          await insertTextAfterCurrentLine(generatedText, false, true);
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

async function sendContextToApi() {
  const editor = vscode.window.activeTextEditor;
  const endpoint = vscode.workspace.getConfiguration().get('vstarcoder.apiEndpoint') as string;
  const contextLines = vscode.workspace.getConfiguration().get('vstarcoder.contextSize') as number;
  const maxtokens = vscode.workspace.getConfiguration().get('vstarcoder.maxTokens') as number;
  if (editor) {
    const document = editor.document;
    const currentLine = editor.selection.active.line;

    const startLine = Math.max(currentLine - contextLines, 0);
    const endLine = Math.min(currentLine + contextLines, document.lineCount - 1);

    const contextLinesText = [];
    for (let line = startLine; line <= endLine; line++) {
      if (line == startLine){
        const lineText = "<fim_prefix>" + document.lineAt(line).text;
        contextLinesText.push(lineText);
      }
      else if (line == endLine){
        const lineText = document.lineAt(line).text + "<fim_middle>";
        contextLinesText.push(lineText);
      }
      else if (line == currentLine){
        // current line is ignored as it will be replaced
        contextLinesText.push("<fim_suffix>")
      }
      else {
        const lineText = document.lineAt(line).text;
        contextLinesText.push(lineText);
      }
    }

    const contextText = contextLinesText.join('\n');
    try {
      const response = await axios.post(endpoint, {
        inputs: contextText,
        parameters: {
          max_new_tokens: maxtokens
        }
      });

      const generatedText = response.data.generated_text;
      if (generatedText) {
        await insertTextAfterCurrentLine(generatedText, true, false);
      } else {
        vscode.window.showErrorMessage('Failed to generate text from API.');
      }
    } catch (error) {
      vscode.window.showErrorMessage('An error occurred while calling the API.');
    }
  } else {
    vscode.window.showErrorMessage('No active text editor.');
  }
}