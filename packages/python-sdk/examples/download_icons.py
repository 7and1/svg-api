"""
Download icons example - demonstrates downloading and saving icons to files.
"""

import pathlib
from svg_api import SvgApi

# Create output directory
output_dir = pathlib.Path("downloaded_icons")
output_dir.mkdir(exist_ok=True)

# Initialize client
client = SvgApi()

# Define icons to download
icons_to_download = [
    ("home", "heroicons"),
    ("search", "lucide"),
    ("user", "feather"),
    ("heart", "heroicons"),
    ("star", "lucide"),
    ("arrow-right", "feather"),
    ("settings", "heroicons"),
    ("mail", "lucide"),
    ("phone", "feather"),
    ("camera", "heroicons"),
]

print("Downloading icons...")
print("-" * 40)

for name, source in icons_to_download:
    try:
        # Create filename: source_name.svg
        filename = f"{source}_{name}.svg"
        path = output_dir / filename

        # Download with custom size and color
        saved_path = client.download_icon(
            name=name,
            path=path,
            source=source,
            size=32,
            color="#3b82f6",  # Blue color
        )

        print(f"  Downloaded: {saved_path}")

    except Exception as e:
        print(f"  Failed {name} from {source}: {e}")

print(f"\nDownloaded {len(list(output_dir.glob("*.svg")))} icons to {output_dir.absolute()}")

# Example: Download all icons from a search
print("\n" + "=" * 40)
print("Downloading search results...")
print("-" * 40)

search_results = client.search("arrow", limit=5)
search_dir = output_dir / "search_results"
search_dir.mkdir(exist_ok=True)

for result in search_results.data:
    try:
        filename = f"{result.source}_{result.name}.svg"
        path = search_dir / filename
        client.download_icon(result.name, path, source=result.source)
        print(f"  Downloaded: {filename}")
    except Exception as e:
        print(f"  Failed {result.name}: {e}")

print(f"\nAll downloads complete!")
print(f"Check {output_dir.absolute()} for the SVG files")
