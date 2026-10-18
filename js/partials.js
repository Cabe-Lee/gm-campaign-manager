class GmHeader extends HTMLElement {
    async connectedCallback() {
        const src = this.getAttribute('src') || '/partials/header.html';
        try {
            const res = await fetch(src);
            if (!res.ok) throw new Error(`Failed to load ${src}: ${res.status}`);
            this.innerHTML = await res.text();
        } catch (err) {
            console.error('[gm-header]', err);
            this.innerHTML = '<div style="color:red;padding:1rem">Header failed to load.</div>';
        }
    }
}
customElements.define('gm-header', GmHeader);

class GmFooter extends HTMLElement {
    async connectedCallback() {
        const src = this.getAttribute('src') || '/partials/footer.html';
        try {
            const res = await fetch(src);
            if (!res.ok) throw new Error(`Failed to load ${src}: ${res.status}`);
            this.innerHTML = await res.text();
        } catch (err) {
            console.error('[gm-footer]', err);
            this.innerHTML = '<div style="color:red;padding:1rem">Footer failed to load.</div>';
        }
    }
}
customElements.define('gm-footer', GmFooter);
