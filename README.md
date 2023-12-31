# VStarCoder

vs code extension to receive code completion from a "local" instance of starcoder.

backend [huggingface-vscode-endpoint-server](https://github.com/piratos/huggingface-vscode-endpoint-server)

## Screencast

![](https://github.com/piratos/vstarcoder/blob/main/screencast.gif)

## Install

1. Download the extension from the release (.vsix file)
2. Install the extension in your vs code compatible editor
   ```
   code --install-extension <path/to/extension.vsix>
   ```
3. In the extension settings setup the api and websocket host

PS: If you run the backend using the following step then use

- `http://<local-ip>:8000/api/generate` for apiEndpoint
- `ws://<local-ip>:8000/ws/generate` for websocketEndpoint

## Run Backend

1. Clone the backend repo `https://github.com/piratos/huggingface-vscode-endpoint-server`
2. Create and activate a python virtualenv using your prefered tool
3. Install dependencies `pip install -r requirements.txt`
4. Run the backend

Example: Running using starcoder ct2fast version (for faster inference)

```
python main.py --pretrained piratos/ct2fast-starcoderplus
```

PS: the pretrained entry can be a local folder or a huggingface repo

## Use

### 1 line inference

This keybinding only sends the current line to the API, this is useful for
simple function where the function naming is very obvious

1. Place the cursor in the line you want to send to inference server
2. Press the keycombination Ctrl + k + k (Press Ctrl then double press "k" button)
3. Completion will be added after the current line

Example:

Before pressing
```
def find_children_processes(parent_pid): <cursor here>

def main():
    children = find_children_processes(1)
```

After pressing

```
def find_children_processes(parent_pid):

    """
    Find all child processes of a given process ID.
    """
    parent = psutil.Process(parent_pid)
    children = parent.children(recursive=True)
    return children

def main():
    children = find_children_processes(1)
```

### Context selection inference

This is useful when you need to send multiple lines to the API to give more context

1. Select the multiple lines containing the context to send to the API
2. Press the keycombination Ctrl + l + l (Press Ctrl then double press "l" button)
3. Completion will be added after the last line of the selection

Example:

Before pressing
```

<start selection># Remove file extension from files in a given folder
# arguments: folder: string, extension: string
# return: List of files renamed
def remove_file_extension(folder, extension):<end selection>

def main():
    children = find_children_processes(1)
```

After pressing Ctrl + l + l

```
# Remove file extension from files in a given folder
# arguments: folder: string, extension: string
# return: List of files renamed
def remove_file_extension(folder, extension):
    files = os.listdir(folder)
    files_to_rename = []
    for file in files:
        if file.endswith(extension):
            files_to_rename.append(file)
    for file in files_to_rename:
        os.rename(os.path.join(folder, file), os.path.join(folder, file[:-len(extension)]))
    return files_to_rename

<Extra lines may appear if the model does not do early stopping (like starcoder)>

def main():
    children = find_children_processes(1)
```

### Fill in the middle inference

This one is used if you need the model to fill code depending on what is before
and after the current line.
PS: You can control the number of lines sent as context (before and after) from
the extension settings.

Before pressing
```
def hello_world():
<cursor is here, line will be overwritten>
    print(hello_string)
```

After pressing
```
def hello_world():
    hello_string = "Hello, World!"
    print(hello_string)
```

## Why not using [huggingface-vscode](https://github.com/huggingface/huggingface-vscode)

huggingface-vscode extension assumes a dedicated hardware running low latency server behind,
the extension sends a lot of autocompletion requests.
Running a backend on consumer hardware introduce latency when running the inference,
which makes the extension unusable. So I created this extension to only trigger autocompletion
on demande (using the key combination)

## Develop
Run
```
npm run install
```
to get the dependencies then edit the `extension.js` logic (or any other file)
then run

```
npm run build
```

to trigger compiling, packaging and installing the extension.
You need to reload the page in order for the new version of the extension to load into your vs code.

Alternatively you can use separate steps

- `npm run compile`
- `npm run package`
- `npm run install`
