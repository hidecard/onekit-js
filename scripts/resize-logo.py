from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/onekit-js/assets/onekit-js-logo-square.png')
outputs = [
    Path('/home/ubuntu/onekit-js/assets/onekit-js-logo-128.png'),
    Path('/home/ubuntu/onekit-js/extensions/vscode-okjs/icon.png'),
]

with Image.open(source) as image:
    image = image.convert('RGBA').resize((128, 128), Image.Resampling.LANCZOS)
    for output in outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, format='PNG', optimize=True)
        print(f'{output}: {image.size[0]}x{image.size[1]} RGBA')
