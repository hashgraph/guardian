'use strict';

export default class Grid {
    container;
    body;

    constructor(container) {
        this.container = container;
        this.onInit();
    }

    async onInit() {
        this.body = document.createElement('div');
        this.body.className = 'grid-container';
        this.container.append(this.body);

        this.gridHeader = document.createElement('div');
        this.gridHeader.className = 'grid-header';
        this.body.append(this.gridHeader);

        this.gridBody = document.createElement('div');
        this.gridBody.className = 'grid-body';
        this.body.append(this.gridBody);
    }

    setHeader(header) {
        this.header = header;
        return this;
    }

    setData(data) {
        this.data = data;
        return this;
    }

    render() {
        if (
            !this.header ||
            !this.header.length ||
            !this.data ||
            !this.data.length
        ) {
            this.gridHeader.classList.toggle('hide', true);
            this.gridHeader.innerHTML = '';
            this.gridBody.classList.toggle('hide', true);
            this.gridBody.innerHTML = '';
            return this;
        }

        this.gridHeader.classList.toggle('hide', false);
        this.gridHeader.innerHTML = '';
        this.gridBody.classList.toggle('hide', false);
        this.gridBody.innerHTML = '';

        let sum = '';
        let count = 0;
        for (const col of this.header) {
            if (col.width) {
                sum += ` - ${col.width}`;
                col._width = col.width;
            } else {
                count++;
            }
        }
        const _width = `calc((100% ${sum}) / ${count})`;
        for (const col of this.header) {
            if (!col.width) {
                col._width = _width;
            }
        }

        for (const col of this.header) {
            const div = document.createElement('div');
            div.className = 'grid-header-col';
            div.textContent = String(col.title);
            div.style.width = col._width;
            this.gridHeader.append(div);
        }

        for (const row of this.data) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'grid-body-row';
            this.gridBody.append(rowDiv);
            for (const col of this.header) {
                const colDiv = document.createElement('div');
                colDiv.className = 'grid-body-col';
                colDiv.textContent = String(row[col.field]);
                colDiv.style.width = col._width;
                rowDiv.append(colDiv);
            }
        }

        return this;
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