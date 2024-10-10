'use strict';

export default class Card {
    container;
    field;
    label;
    value;
    sliders;
    index;

    cardHeader;
    cardSlider;
    cardValue;
    cardSliderContainer;

    constructor(container) {
        this.container = container;
        this.field = '';
        this.label = '';
        this.value = [];
        this.sliders = null;
        this.index = 0;
        this.onInit();
    }

    async onInit() {
        this.body = document.createElement('div');
        this.body.className = 'card-container';
        this.container.append(this.body);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        this.body.append(cardBody);

        this.cardHeader = document.createElement('div');
        this.cardHeader.className = 'card-header hide';
        cardBody.append(this.cardHeader);

        const cardValues = document.createElement('div');
        cardValues.className = 'card-values';
        cardBody.append(cardValues);

        this.cardSlider = document.createElement('div');
        this.cardSlider.className = 'card-slider hide';
        cardBody.append(this.cardSlider);

        this.cardValue = document.createElement('div');
        this.cardValue.className = 'card-value';
        cardValues.append(this.cardValue);

        this.cardPrev = document.createElement('div');
        this.cardPrev.className = 'card-diff hide';
        cardValues.append(this.cardPrev);

        this.cardSliderContainer = document.createElement('div');
        this.cardSliderContainer.className = 'card-slider-container';
        this.cardSlider.append(this.cardSliderContainer);
        this.cardSliderContainer.addEventListener('click', async (event) => {
            event.preventDefault();
            const index = event?.target?.getAttribute('index') || '0';
            this.index = parseInt(index, 10);
            this.render();
        });

        cardBody.addEventListener('click', async (event) => {
            event.preventDefault();
            if (this.callback) {
                this.callback(this, this.field, this.index)
            }
        });

    }

    setField(fieldName) {
        this.field = fieldName;
        return this;
    }

    setLabel(label) {
        this.label = label;
        if (this.label) {
            this.cardHeader.textContent = String(this.label);
            this.cardHeader.classList.toggle('hide', false);
        } else {
            this.cardHeader.textContent = '';
            this.cardHeader.classList.toggle('hide', true);
        }
        return this;
    }

    setValue(value) {
        if (Array.isArray(value)) {
            this.value = value;
        } else if (value !== null && value !== undefined) {
            this.value = [value];
        } else {
            this.value = [0];
        }
        this.index = 0;
        return this;
    }

    setPrev(value) {
        if (Array.isArray(value)) {
            this.prev = value;
        } else if (value !== null && value !== undefined) {
            this.prev = [value];
        } else {
            this.prev = null;
        }
        return this;
    }

    setSliders(names) {
        this.sliders = names;
        this.index = 0;
        if (this.sliders && this.sliders.length) {
            this.cardSlider.classList.toggle('hide', false);
            this.cardSliderContainer.innerHTML = '';
            for (let index = 0; index < this.sliders.length; index++) {
                const div = document.createElement('div');
                div.className = 'card-slider-btn';
                div.textContent = String(this.sliders[index]);
                div.setAttribute('index', String(index));
                this.cardSliderContainer.append(div);
            }
        } else {
            this.cardSlider.classList.toggle('hide', true);
            this.cardSliderContainer.innerHTML = '';
        }
        return this;
    }

    numberFormat(value) {
        if (!value) {
            return '0';
        }
        return parseInt(value, 10).toLocaleString()
    }

    change(callback) {
        this.callback = callback;
        this.body.classList.toggle('selectable', !!this.callback);
        return this;
    }

    render() {
        for (let index = 0; index < this.cardSliderContainer.children.length; index++) {
            const element = this.cardSliderContainer.children[index];
            element.classList.toggle('active', index === this.index);
        }
        this.cardValue.textContent = this.numberFormat(this.value[this.index]);
        if (this.prev) {
            const diff = this.value[this.index] - this.prev[this.index];
            if (Number.isFinite(diff)) {
                this.cardPrev.classList.toggle('hide', false);
                if (diff === 0) {
                    this.cardPrev.textContent = '-';
                    this.cardPrev.setAttribute('diff-value', '0');
                } else if (diff > 0) {
                    this.cardPrev.textContent = '+ ' + this.numberFormat(Math.abs(diff));
                    this.cardPrev.setAttribute('diff-value', '1');
                } else {
                    this.cardPrev.textContent = '- ' + this.numberFormat(Math.abs(diff));
                    this.cardPrev.setAttribute('diff-value', '2');
                }
            } else {
                this.cardPrev.classList.toggle('hide', true);
                this.cardPrev.innerHTML = '';
                this.cardPrev.setAttribute('diff-value', '0');
            }
        } else {
            this.cardPrev.classList.toggle('hide', true);
            this.cardPrev.innerHTML = '';
            this.cardPrev.setAttribute('diff-value', '0');
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