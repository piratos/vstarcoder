import * as vscode from 'vscode';
import axios from 'axios';
import WebSocket from 'ws';

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

  disposable = vscode.commands.registerCommand('extension.sendWordsToApi', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const line = editor.document.lineAt(editor.selection.active.line).text.trim();
      await sendWordsToApi(line);
    }
  });

  context.subscriptions.push(disposable);
}

function insertTextAfterCurrentLine2(text: string) {
  console.log("Insert Text received " + text);
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.selection;
    const line = selection.active.line;
    const lineText = editor.document.lineAt(line).text;

    editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(line + 1, 0), `${text}\n`);
    }).then(() => {
      const newPosition = new vscode.Position(line + 2, 0); // Move the cursor to the line after the pasted text
      const newSelection = new vscode.Selection(newPosition, newPosition);
      editor.selection = newSelection;
    });
  }
}

async function insertTextAfterCurrentLine(text: string) {
  console.log(text);
  const editor = vscode.window.activeTextEditor;
  if (editor) {
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


async function sendLineToApi(line: string) {
  const endpoint = vscode.workspace.getConfiguration().get('lineToApi.apiEndpoint') as string;

  try {
    const data = {
      inputs: line,
      parameters: {
        max_new_tokens: 10
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

async function sendWordsToApi(line: string) {
  const endpoint = vscode.workspace.getConfiguration().get('lineToApi.websocketEndpoint') as string;
  const editor = vscode.window.activeTextEditor;
  // textEditor is hooribly slow when updating text
  // while websockets will respond almost immediatly after the first word
  // is returned, streaming word by word does not seem viable but I ll keep
  // the logic here
  // it is recommended to use http request using Ctrl+k+k
  const wordCache: string[] = [];

  try {
    const socket = new WebSocket(endpoint);

    socket.on('open', () => {
      console.log('WebSocket connection established');
      socket.send(line); // Send the current line to the WebSocket server
    });

    socket.on('message', async (message: string) => {
      const generatedWord = message.toString();
      wordCache.push(generatedWord);
    });

    // the server will close the socket after last token is sent
    socket.on('close', () => {
      console.log('WebSocket connection closed');
      insertTextAfterCurrentLine(wordCache.join(""));
      wordCache.splice(0);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      vscode.window.showErrorMessage('Failed to receive words from API.');
    });
  } catch (error) {
    console.error('WebSocket connection error:', error);
    vscode.window.showErrorMessage('Failed to establish WebSocket connection.');
  }
}
