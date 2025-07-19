# Web Font Auto-Subsetting Workflow

Automated web font subsetting workflow with chunked loading for optimal performance.

## Supported Fonts

### Chinese Fonts

#### I.MingCP
- **Font ID**: `imingcp`
- **Type**: Traditional Chinese serif
- **Source**: [ichitenfont/I.Ming](https://github.com/ichitenfont/I.Ming)
- **License**: IPA Font License Agreement v1.0

#### LXGW WenKai TC (Light Weight Only)
- **Font ID**: `lxgwwenkaitc`
- **Type**: Traditional Chinese handwriting
- **Source**: [lxgw/LxgwWenkaiTC](https://github.com/lxgw/LxgwWenkaiTC)
- **License**: SIL Open Font License 1.1

### Variable Fonts

#### Amstelvar
- **Font ID**: `amstelvar`
- **Type**: Latin variable font
- **Source**: [googlefonts/amstelvar](https://github.com/googlefonts/amstelvar)
- **License**: SIL Open Font License 1.1

## Usage

### CDN

[![](https://data.jsdelivr.com/v1/package/gh/reuixiy/fonts/badge)](https://www.jsdelivr.com/package/gh/reuixiy/fonts)

```html
<!-- All fonts -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/fonts.min.css">

<!-- Individual fonts -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/imingcp.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/lxgwwenkaitc.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/amstelvar.min.css">
```

### CSS

```css
/* Traditional Chinese serif */
.serif { font-family: 'I.MingCP', serif; }

/* Traditional Chinese handwriting */
.handwriting { font-family: 'LXGW WenKai TC', cursive; font-weight: 300; }

/* Latin variable font */
.variable { font-family: 'Amstelvar', serif; }
```

## Development

### Setup

```bash
git clone <repo-url>
cd fonts
pnpm install
```

### CLI Commands

```bash
pnpm run cli:build              # Build all fonts
pnpm run cli:build --fonts imingcp,lxgwwenkaitc  # Build specific fonts
pnpm run cli:check              # Check for updates
pnpm run cli:clean --all        # Clean cache
```

### Scripts

```bash
pnpm start                      # Full workflow with version check
pnpm run build                  # Compile TypeScript
pnpm run dev                    # Development mode with watch
```

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.

Individual fonts maintain their respective licenses as documented above.

## Acknowledgements

Thanks to [KonghaYao/cn-font-split](https://github.com/KonghaYao/cn-font-split) for lightning-fast subsetting.
