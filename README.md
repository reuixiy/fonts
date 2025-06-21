# Web Font CDN

Generated on: 2025-06-21T02:00:52.565Z
Source: [reuixiy/fonts](https://github.com/reuixiy/fonts)

## Quick Start

Add the following links to your HTML head section to use these fonts:

### All Fonts (Recommended)
```html
<!-- Minified CSS with all fonts -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/fonts.min.css">

<!-- Unminified CSS with all fonts -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/fonts.css">
```

### Individual Fonts

#### I.Ming CP (Traditional Chinese Serif)
```html
<!-- Minified -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/imingcp.min.css">

<!-- Unminified -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/imingcp.css">
```

#### LXGW WenKai TC (Traditional Chinese Handwriting)
```html
<!-- Minified -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/lxgwwenkaitc.min.css">

<!-- Unminified -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/lxgwwenkaitc.css">
```

#### Amstelvar (Latin Variable Font)
```html
<!-- Minified -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/amstelvar.min.css">

<!-- Unminified -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/reuixiy/fonts@build/css/amstelvar.css">
```

## Usage in CSS

After including the CSS files, you can use the fonts in your stylesheets:

```css
/* Traditional Chinese Serif */
.serif-text {
  font-family: 'I.MingCP', serif;
}

/* Traditional Chinese Handwriting */
.handwriting-text {
  font-family: 'LXGW WenKai TC', sans-serif;
  font-weight: 300;
}

/* Latin Variable Font */
.variable-text {
  font-family: 'Amstelvar', serif;
  font-variation-settings: 'wght' 400, 'wdth' 100, 'opsz' 14;
}
```

## Directory Structure

```
css/                   # CSS files with @font-face declarations
├── fonts.css         # All fonts (unminified)
├── fonts.min.css     # All fonts (minified)
├── imingcp.css       # I.Ming CP (unminified)
├── imingcp.min.css   # I.Ming CP (minified)
├── lxgwwenkaitc.css  # LXGW WenKai TC (unminified)
├── lxgwwenkaitc.min.css # LXGW WenKai TC (minified)
├── amstelvar.css     # Amstelvar (unminified)
└── amstelvar.min.css # Amstelvar (minified)

fonts/                # Font files (.woff2 format)
├── imingcp/          # I.Ming CP chunks
├── lxgwwenkaitc/     # LXGW WenKai TC chunks
└── amstelvar/        # Amstelvar chunks

LICENSE.md            # License information for all fonts
LICENSE.json          # Machine-readable license data
```

## License

Please refer to [LICENSE.md](./LICENSE.md) for detailed license information of each font.

## Updates

This repository is automatically updated daily to check for new font versions. The build is triggered when changes are detected.

For more information, visit the [source repository](https://github.com/reuixiy/fonts).
