# Bedrock Map Viewer (Test Scaffold)

Placeholder project structure — **no functionality yet**.

Planned stack:

- Bedrock chunk reader
- Top-down renderer (uNmINeD-style)
- Isometric renderer (later)
- Leaflet web viewer with view-mode toggle

## Structure

```
bedrock-map-viewer/
├── src/
│   ├── reader/      # Bedrock LevelDB / chunk parsing
│   ├── renderer/    # Top-down + isometric tile rendering
│   └── cli/         # Command-line entry point
└── web/
    └── index.html   # Leaflet viewer shell (UI only)
```

## Status

| Component        | Status        |
|------------------|---------------|
| Chunk reader     | Not started   |
| Top-down render  | Not started   |
| Iso render       | Not started   |
| Web viewer       | UI shell only |
