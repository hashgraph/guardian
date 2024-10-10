'use strict';

export default class Dropdown {
    container;
    body;
    details
    headers;
    values;
    title;
    data;

    constructor(container) {
        this.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        this.container = container;
        this.onInit();
    }

    async onInit() {
        this.body = document.createElement('div');
        this.body.className = 'dropdown-container';
        this.container.append(this.body);

        const details = document.createElement('details');
        details.className = 'custom-select';
        this.body.append(details);

        const summary = document.createElement('summary');
        summary.className = 'radios';
        details.append(summary);

        const ul = document.createElement('ul');
        ul.className = 'list';
        details.append(ul);

        this.details = details;
        this.headers = summary;
        this.values = ul;
    }

    setTitle(title) {
        this.title = title;
        return this;
    }

    setData(data) {
        if (Array.isArray(data)) {
            this.data = data;
        } else {
            this.data = [];
        }
        return this;
    }

    select(value) {
        let id;
        const index = this.data.findIndex(i => i.value === value) + 1;
        for (let i = 0; i < this.headers.children.length; i++) {
            const input = this.headers.children[i];
            input.removeAttribute('checked');
            input.checked = false;
            if (i === index) {
                input.setAttribute('checked', 'true');
                input.checked = true;
                id = input.id;
            }
        }
        const item = this.data.find(i => i.value === id);
        if (this.callback) {
            this.callback(item);
        }
        return this;
    }

    change(callback) {
        this.callback = callback;
        return this;
    }

    render() {
        this.headers.innerHTML = '';
        this.values.innerHTML = '';

        const defaultInput = document.createElement('input');
        defaultInput.setAttribute('type', 'radio');
        defaultInput.setAttribute('name', this.id);
        defaultInput.setAttribute('id', 'default');
        defaultInput.setAttribute('title', this.title);
        defaultInput.setAttribute('checked', 'true');
        this.headers.append(defaultInput);

        for (const item of this.data) {
            const input = document.createElement('input');
            input.setAttribute('type', 'radio');
            input.setAttribute('name', this.id);
            input.setAttribute('id', item.value);
            input.setAttribute('title', item.name);
            this.headers.append(input);

            const li = document.createElement('li');
            this.values.append(li);

            const label = document.createElement('label');
            label.setAttribute('for', item.value);
            label.textContent = item.name;
            li.append(label);

            input.addEventListener('change', async (event) => {
                event.preventDefault();
                this.onChange(event);
            });
        }

        return this;
    }

    onChange(event) {
        const value = event.target.id;
        const item = this.data.find(i => i.value === value);
        this.details.removeAttribute('open');
        if (this.callback) {
            this.callback(item);
        }
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