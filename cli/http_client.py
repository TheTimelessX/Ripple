import requests

class HttpClient(object):
    def __init__(self):
        self.http_url = "http://127.0.0.1:6000"

    def build(self, method: str) -> str:
        return self.http_url + method if self.http_url.endswith("/") else \
               self.http_url + "/" + method

    def sign_up(self, name: str, bio: str | None) -> dict:
        try:
            resp = requests.post(self.build("signup"), json={ "name": name, "bio": bio })
            return resp.json();
        except Exception as err:
            print(err)
            raise requests.exceptions.HTTPError("error while sending request")
        
    def get_me(self, auth: str) -> dict:
        try:
            resp = requests.post(self.build("getMe"), json={ "auth": auth })
            return resp.json();
        except Exception as err:
            print(err)
            raise requests.exceptions.HTTPError("error while sending request")
        
    def get_user_by_id(self, id: int) -> dict:
        try:
            resp = requests.post(self.build("getUserById"), json={ "id": id })
            return resp.json();
        except Exception as err:
            print(err)
            raise requests.exceptions.HTTPError("error while sending request")
    
    def get_user_by_name(self, name: str) -> dict:
        try:
            resp = requests.post(self.build("getUserByName"), json={ "name": name })
            return resp.json();
        except Exception as err:
            print(err)
            raise requests.exceptions.HTTPError("error while sending request")

    def change_server(self, new_server_url: str) -> bool:
        self.http_url = new_server_url
        return True
