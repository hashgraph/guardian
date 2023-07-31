"use strict";

export default class Loader {
    container;
    timer

    constructor(container) {
        this.container = container;
        this.onInit();
    }

    async onInit() {
        this.timer = null;
        this.body = document.createElement("div");
        this.body.className = 'loader-container';
        this.container.append(this.body);
        const span = document.createElement("span");
        span.className = 'loader';
        this.body.append(span);
        this.body.classList.toggle('hide', true);
    }

    toggle(status) {
        if(status) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        if(this.timer) {
            clearTimeout(this.timer);
        }
        this.body.classList.toggle('hide', false);
    }

    hide() {
        if(this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.body.classList.toggle('hide', true);
        }, 600);
    }

    destroy() {
        try {
            if(this.timer) {
                clearTimeout(this.timer);
            }
            if (this.body) {
                this.body.remove()
                this.body = null;
            }
        } catch (error) {
            return;
        }
    }
}