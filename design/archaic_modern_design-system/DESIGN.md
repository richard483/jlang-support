# Design System Strategy: The Editorial Sensei

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Editorial Sensei."** 

This system moves beyond the "app-like" utility of standard educational platforms and adopts the visual language of a high-end academic journal or a premium architectural monograph. We are building a space that feels quiet, authoritative, and intentional. To break the "template" look, we prioritize generous white space, intentional asymmetry (e.g., staggering content blocks), and high-contrast typography scales that celebrate the beauty of Japanese glyphs. This is not just a tool; it is a digital curator of language.

## 2. Colors
Our palette balances the warmth of traditional Japanese paper with the vibrant energy of modern Tokyo.

*   **Primary (#a04100 / #ff7a30):** Represents vitality and focus. Use it for critical CTAs and progress indicators.
*   **Secondary (#485e8a):** A deep, scholarly blue used to anchor the experience. Use for navigational elements and academic headers.
*   **Neutrals:** The `surface` series (#fff8f4 to #e7e1dd) provides the "paper" on which our content lives.

### The "No-Line" Rule
Standard UI relies on borders to separate ideas; we do not. **Explicitly prohibit 1px solid borders for sectioning.** To define boundaries, designers must use background color shifts. For example, a card (using `surface-container-lowest`) should sit on a section background of `surface-container-low`. The transition of tone is the divider.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked physical layers. 
*   **Background (#fff8f4):** The base canvas.
*   **Surface-Container-Low (#f9f2ee):** Sub-sections or secondary content areas.
*   **Surface-Container-Highest (#e7e1dd):** For interactive sidebars or deep-nested utility panels.
This creates a "nested" depth that feels organic and sophisticated rather than flat and digital.

### The "Glass & Gradient" Rule
To add visual "soul," use subtle gradients (e.g., `primary` transitioning into `primary-container`) for Hero backgrounds or main action buttons. For floating elements like mobile menus or tooltips, apply **Glassmorphism**: use semi-transparent surface colors with a `backdrop-blur` effect to let the rich background tones bleed through, softening the interface.

## 3. Typography
The typography is our primary brand vehicle. We pair the efficiency of **Plus Jakarta Sans** with the timeless elegance of **Noto Serif JP**.

*   **Display & Headlines:** Use `notoSerif` for all Japanese characters and primary English headings. This conveys the "Sophisticated Scholar" persona. Large `display-lg` (3.5rem) should be used with generous leading to feel like a magazine cover.
*   **Body & UI:** Use `plusJakartaSans`. This provides a modern, legible contrast to the serif headers.
*   **Hierarchy:** High contrast in scale is encouraged. Pair a `display-md` headline with a `label-sm` sub-header to create a dramatic, editorial hierarchy that guides the eye with authority.

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** rather than structural lines.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift that mimics heavy cardstock resting on a desk.
*   **Ambient Shadows:** When a "floating" effect is mandatory (e.g., a modal), use extra-diffused shadows. Set blur values high (20px+) and opacity low (4%–8%). The shadow color should be a tinted version of `on-surface` (#1d1b19) to ensure it feels like a natural shadow cast on paper, not a grey drop-shadow.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use a "Ghost Border": the `outline-variant` token at 15% opacity. High-contrast, 100% opaque borders are strictly forbidden.
*   **Glassmorphism:** Use semi-transparent surface colors for overlays to maintain a sense of space and context, preventing the UI from feeling claustrophobic.

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#a04100) or a gradient to `primary-container`. Use `full` roundedness (9999px) to contrast against the sharp editorial grid.
*   **Secondary:** Ghost style using the `secondary` (#485e8a) color with a "Ghost Border."
*   **Tertiary:** Text-only with an underline that appears only on hover, maintaining the minimalist aesthetic.

### Input Fields
*   **Styling:** Avoid the "box" look. Use a `surface-container-high` background with a subtle bottom-stroke only (Ghost Border).
*   **States:** On focus, the bottom-stroke should transition to `primary`.

### Cards & Lists
*   **Rule:** Forbid divider lines. 
*   **Implementation:** Separate list items using vertical white space (use Spacing Scale `4` or `5`) or alternating background tints between `surface` and `surface-container-low`.
*   **Cards:** Use `lg` (0.5rem) roundedness and background color shifts to define the container.

### Special Educational Components
*   **Character Study Cards:** Large `notoSerif` glyphs centered on a `surface-container-lowest` background. Use `display-lg` for the character to emphasize its form as art.
*   **Progress Steppers:** Use the `secondary` blue for completed states and `primary` orange for the active state, represented by thin, elegant lines rather than thick blocks.

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Offset images and text blocks to create a custom, editorial feel.
*   **Use White Space:** Treat space as a functional element that aids focus and mental "breathing" during study.
*   **Reference the Spacing Scale:** Stick strictly to the defined scale (e.g., `spacing-10` for section gaps) to ensure mathematical harmony.

### Don't:
*   **Don't use 100% Black (#000000) for lines:** It is too harsh for this palette. Use `outline-variant` or color shifts.
*   **Don't use standard "Card Shadows":** Rely on tonal shifts first. Only use shadows for elements that truly float over the content.
*   **Don't clutter:** If a screen feels busy, increase the background spacing and reduce the number of competing `surface` levels.
*   **Don't use Default Roundedness:** Stick to the scale; use `none` for an architectural feel or `full` for interactive elements. Avoid "middle-ground" roundedness that looks generic.