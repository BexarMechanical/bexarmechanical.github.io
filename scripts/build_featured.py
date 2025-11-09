import json, os
from pathlib import Path

FEATURED_DIR = Path("images/featured")
OUT = Path("data/featured.json")

def humanize(name: str) -> str:
    name = os.path.splitext(name)[0]
    return name.replace("-", " ").replace("_", " ").title()

def main():
    FEATURED_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for fn in sorted(FEATURED_DIR.iterdir()):
      if fn.suffix.lower() in (".jpg",".jpeg",".png",".webp",".avif"):
        items.append({
          "src": str(fn).replace("\\","/"),
          "alt": f"{humanize(fn.name)}",
          "caption": ""
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
      json.dump(items, f, indent=2)
    print(f"Wrote {OUT} with {len(items)} items.")

if __name__ == "__main__":
    main()
