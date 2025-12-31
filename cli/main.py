from textual.app import App, ComposeResult
from textual.widgets import Input, RichLog
from textual.containers import Vertical
from textual.reactive import reactive
from rich.text import Text
import socketio
import colorkits
import http_client
import re
import asyncio
import os
import random

httpClient = http_client.HttpClient()
socket_server = "http://127.0.0.1:7002"
__dirname = os.path.dirname(os.path.abspath(__file__))
url_regex =  re.compile(
    r"(?i)\b("
    r"(?:https?://|ftp://)?"
    r"(?:www\.)?"
    r"(?:[a-z0-9-]+\.)+"
    r"[a-z]{2,}"
    r"(?:\:\d+)?"
    r"(?:/[^\s]*)?"
    r")"
)

def extractLinks(text: str) -> list[str]:links = url_regex.findall(text);return [match[0] if match[0] else text for match in links]
def prepareLink(link: str):return f"[rgb(21,29,133) underline]{link}[rgb(21,29,133) underline]"

if not (os.path.exists(os.path.join(__dirname, ".authentication_of_service"))):
    name = input(colorkits.rgbaToAnsiFg(246, 255, 0) + "[?] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "your name > ").strip()
    bio = input(colorkits.rgbaToAnsiFg(246, 255, 0) + "[?] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "your bio (enter to escape) > ").strip()

    if (len(bio) == 0):
        bio = None
    
    data = httpClient.sign_up(name, bio)
    if (data['status'] == True):
        open(os.path.join(__dirname, ".authentication_of_service"), "a").write(
            data['result']['auth']
        )

        print(colorkits.rgbaToAnsiFg(6, 153, 3) + "[+] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "sigend up" + colorkits.getReset())
        print(colorkits.rgbaToAnsiFg(6, 153, 3) + "[+] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "for chatting, run script again" + colorkits.getReset())
    else:
        print(colorkits.rgbaToAnsiFg(255, 0, 0) + f"[!] {data['message']}" + colorkits.getReset())
        exit(0)
else:
    fileContent = open(os.path.join(__dirname, ".authentication_of_service"), "r").read().strip()
    if (len(fileContent) == 0):
        name = input(colorkits.rgbaToAnsiFg(246, 255, 0) + "[?] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "your name > ").strip()
        bio = input(colorkits.rgbaToAnsiFg(246, 255, 0) + "[?] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "your bio (enter to escape) > ").strip()

        if (len(bio) == 0):
            bio = None
        
        data = httpClient.sign_up(name, bio)
        if (data['status'] == True):
            open(os.path.join(__dirname, ".authentication_of_service"), "a").write(
                data['result']['auth']
            )

            print(colorkits.rgbaToAnsiFg(6, 153, 3) + "[+] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "sigend up" + colorkits.getReset())
            print(colorkits.rgbaToAnsiFg(6, 153, 3) + "[+] " + colorkits.rgbaToAnsiFg(255, 255, 255) + "for chatting, run script again" + colorkits.getReset())
        else:
            print(colorkits.rgbaToAnsiFg(255, 0, 0) + f"[!] {data['message']}" + colorkits.getReset())
            exit(0)

auth = open(os.path.join(__dirname, ".authentication_of_service"), "r").read().strip()
thatsme = httpClient.get_me(auth)
sio = socketio.AsyncClient()

if (thatsme['status'] == False):
    print(colorkits.rgbaToAnsiFg(255, 0, 0) + f"[!] invalid auth token, run this to signup again: rm {os.path.join(__dirname, ".authentication_of_service")}" + colorkits.getReset())
    exit(0)

MAX_MESSAGES = 2000
user_colors = {}
user_colors[thatsme['result']['id']] = [
    random.randint(0, 255),
    random.randint(0, 255),
    random.randint(0, 255)
]

class ChatApp(App):
    CSS = """
    Vertical {
        height: 100%;
    }
    #messages {
        height: 70%;
        border: round black;
        padding: 1 1;
    }
    #input {
        height: 30%;
        border: round purple;
        padding: 1 1;
    }
    """

    messages = reactive([])

    def compose(self) -> ComposeResult:
        self.msg_box = RichLog(
            id="messages",
            auto_scroll=True
        )
        self.input_box = Input(
            placeholder="Type message/command here...",
            id="input"
        )
        yield Vertical(
            self.msg_box,
            self.input_box
        )

    async def on_mount(self):
        self.input_box.focus()
        await sio.connect(socket_server)
        await sio.emit("sign")
        asyncio.create_task(self.socket_listener())

    async def socket_listener(self):
        @sio.event
        async def connect():
            self.msg_box.write(Text.from_markup("[rgb(0,255,0)]Connected to server[/rgb(0,255,0)]"))
            
            await sio.emit("sign")
        
        @sio.event
        async def disconnect():
            self.msg_box.write(Text.from_markup("[rgb(255,0,0)]Disconnected[/rgb(255,0,0)]"))
            
        
        @sio.on('newMessage')
        async def on_message(data):
            if (thatsme['result']['id'] != data['from_id']):
                if (data['from_id'] in user_colors.keys()):
                    self.msg_box.write(Text.from_markup(f"{"[rgb(47,0,255)]⨈[/rgb(47,0,255)] " if data['verified'] == True else ""}[rgb({user_colors[data['from_id']][0]},{user_colors[data['from_id']][1]},{user_colors[data['from_id']][2]})]{data['name']}[/rgb({user_colors[data['from_id']][0]},{user_colors[data['from_id']][1]},{user_colors[data['from_id']][2]})]: {data['text']}"))
                else:
                    user_colors[user_colors['from_id']] = [
                        random.randint(0, 255),
                        random.randint(0, 255),
                        random.randint(0, 255)
                    ]
                    self.msg_box.write(Text.from_markup(f"{"[rgb(47,0,255)]⨈[/rgb(47,0,255)] " if data['verified'] == True else ""}[rgb({user_colors[data['from_id']][0]},{user_colors[data['from_id']][1]},{user_colors[data['from_id']][2]})]{data['name']}[/rgb({user_colors[data['from_id']][0]},{user_colors[data['from_id']][1]},{user_colors[data['from_id']][2]})]: {data}"))
                    

    async def on_input_submitted(self, message: Input.Submitted):
        _links = extractLinks(message.value)
        for l in _links:
            message.value = message.value.replace(
                l,
                prepareLink(l)
            )
        user_msg = f"{"[rgb(47,0,255)]⨈[/rgb(47,0,255)] " if thatsme['result']['verified'] == True else ""}[rgb({user_colors[thatsme['result']['id']][0]},{user_colors[thatsme['result']['id']][1]},{user_colors[thatsme['result']['id']][2]})]{thatsme['result']['name']}[/rgb({user_colors[thatsme['result']['id']][0]},{user_colors[thatsme['result']['id']][1]},{user_colors[thatsme['result']['id']][2]})]: {message.value}"
        self.msg_box.write(Text.from_markup(user_msg))

        if (message.value.lower() in ['/quit', '/exit']):
            await sio.disconnect()
            exit(0)
        elif (message.value.lower().startswith("/user")):
            uname = message.value[5:].strip()
            if (len(uname) == 0):
                self.msg_box.write(Text.from_markup("[rgb(255,0,0)]Write username in it[/rgb(255,0,0)]"))
                
            elif (uname != "me"):
                userdata = httpClient.get_user_by_name(uname)
                if (userdata['status'] == False):
                    self.msg_box.write(Text.from_markup(f"[rgb(255,0,0)]{userdata['message']}[/rgb(255,0,0)]"))
                    
                else:
                    self.msg_box.write("")

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ Name[/rgb(34,255,0)]       [rgb(255,255,255)]{userdata['result']['name']}[/rgb(255,255,255)]"))  

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ ID[/rgb(34,255,0)]         [rgb(189,230,7)]{userdata['result']['id']}[/rgb(189,230,7)]"))

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ Verified[/rgb(34,255,0)]   [rgb(0,255,208)]{userdata['result']['verified']}[/rgb(0,255,208)]"))

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ Bio[/rgb(34,255,0)]        [rgb(255,255,255)]{userdata['result']['bio']}[/rgb(255,255,255)]"))
                    
                    self.msg_box.write("")
                
            else:
                    self.msg_box.write("")

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ Name[/rgb(34,255,0)]       [rgb(255,255,255)]{thatsme['result']['name']}[/rgb(255,255,255)]"))  

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ ID[/rgb(34,255,0)]         [rgb(189,230,7)]{thatsme['result']['id']}[/rgb(189,230,7)]"))

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ Verified[/rgb(34,255,0)]   [rgb(0,255,208)]{thatsme['result']['verified']}[/rgb(0,255,208)]"))

                    self.msg_box.write(Text.from_markup(f"[rgb(34,255,0)]▬ Bio[/rgb(34,255,0)]        [rgb(255,255,255)]{thatsme['result']['bio']}[/rgb(255,255,255)]"))
                    
                    self.msg_box.write("")

        else:
            if (len(message.value) != 0):
                await sio.emit('sendMessage', { "from_auth": auth, "text": message.value })
        
        self.input_box.value = ""

if __name__ == "__main__":
    ChatApp().run()
