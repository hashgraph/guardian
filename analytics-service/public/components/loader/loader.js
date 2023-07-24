"use strict";

export default class Loader {
    container;

    constructor(container) {
        this.container = container;
        this.onInit();
    }

    async onInit() {
        this.body = document.createElement("div");
        this.body.className = 'loader-container';
        this.container.append(this.body);

        const span = document.createElement("span");
        span.className = 'loader';
        this.body.append(span);

        this.hide();
    }

    toggle(status) {
        this.body.classList.toggle('hide', status);
    }

    show() {
        this.body.classList.toggle('hide', false);
    }

    hide() {
        this.body.classList.toggle('hide', true);
    }

    destroy() {
        try {
            if (this.body) {
                this.body.remove()
                this.body = null;
            }
        } catch (error) {
            return;
        }
    }
}