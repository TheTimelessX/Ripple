
def rgbaToAnsiFg(r: int, g: int, b: int, a: float = 1.0) -> str:
    r = max(0, min(255, int(r)))
    g = max(0, min(255, int(g)))
    b = max(0, min(255, int(b)))
    return f"\033[38;2;{r};{g};{b}m"

def rgbaToAnsiBg(r: int, g: int, b: int, a: float = 1.0) -> str:
    r = max(0, min(255, int(r)))
    g = max(0, min(255, int(g)))
    b = max(0, min(255, int(b)))
    return f"\033[48;2;{r};{g};{b}m"

def getReset() -> str:
    return "\033[0m"

def link(link: str) -> str:
    return "\033[4;31m" + rgbaToAnsiFg(11, 23, 191) + link + getReset()
