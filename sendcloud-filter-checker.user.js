// ==UserScript==
// @name         Sendcloud filter checker
// @match        https://app.sendcloud.com/v2/shipping/packgo/queue*
// @updateURL    https://raw.githubusercontent.com/greentradingxxl/sendcloud-scripts/main/sendcloud-filter-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/greentradingxxl/sendcloud-scripts/main/sendcloud-filter-checker.user.js
// @grant        none
// ==/UserScript==

(function() {

    function isCorrectPage() {
        return window.location.pathname === '/v2/shipping/packgo/queue';
    }

    function showWarning(statusSelected = [], paymentSelected = []) {
        if (document.getElementById('filter-warning')) return;

        const isGerman =
            [...statusSelected, ...paymentSelected].some(text =>
                text.includes('verarbeitung') ||
                text.includes('bezahlt')
            );

        const warningText = isGerman
            ? 'FILTER FALSCH - NICHT VERPACKEN\nShop-Status muss auf „Verarbeitung“ und „partial-shipped“ stehen, und Zahlungsstatus auf „Bezahlt”.'
            : 'FILTERS VERKEERD - NIET INPAKKEN\nShop status moet op "Orders verwerken" en "partial-shipped", en Betaalstatus op "betaald".';

        const warning = document.createElement('div');
        warning.id = 'filter-warning';
        warning.style.position = 'fixed';
        warning.style.top = '0';
        warning.style.left = '0';
        warning.style.right = '0';
        warning.style.background = 'red';
        warning.style.color = 'white';
        warning.style.padding = '20px';
        warning.style.textAlign = 'center';
        warning.style.zIndex = '99999';
        warning.style.fontSize = '18px';
        warning.style.fontWeight = 'bold';
        warning.innerText = warningText;

        document.body.appendChild(warning);
    }

    function removeWarning() {
        const warning = document.getElementById('filter-warning');
        if (warning) {
            warning.remove();
        }
    }

    function blockButton() {
        const btn = document.querySelector('[data-test="packgo-queue-buttons-create-label"]');
        if (!btn) return;

        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    }

    function unblockButton() {
        const btn = document.querySelector('[data-test="packgo-queue-buttons-create-label"]');
        if (!btn) return;

        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
    }

    function getSelectedOptions(filterTestId) {
        const filter = document.querySelector(`[data-test="${filterTestId}"]`);
        if (!filter) return [];

        return [...filter.querySelectorAll('.ui-filter__list-btn[selected="true"]')]
            .map(el => {
                const label = el.querySelector('span');
                return label ? label.innerText.trim().toLowerCase() : '';
            })
            .filter(Boolean);
    }

    function matchOneOf(list, options) {
        return options.some(opt => list.includes(opt));
    }

    function checkFilters() {

        // 👉 BELANGRIJK: alleen uitvoeren op juiste pagina
        if (!isCorrectPage()) {
            removeWarning();
            unblockButton();
            return;
        }

        const statusSelected = getSelectedOptions('pack-go-order-status-filter');
        const paymentSelected = getSelectedOptions('pack-go-payment-status-filter');

        console.log('STATUS:', statusSelected);
        console.log('PAYMENT:', paymentSelected);

        const correctStatus =
            statusSelected.length === 2 &&
            matchOneOf(statusSelected, [
                'orders verwerken',
                'verarbeitung'
            ]) &&
            matchOneOf(statusSelected, [
                'partial-shipped'
            ]);

        const correctPayment =
            paymentSelected.length === 1 &&
            matchOneOf(paymentSelected, [
                'betaald',
                'bezahlt'
            ]);

        if (!correctStatus || !correctPayment) {
            showWarning(statusSelected, paymentSelected);
            blockButton();
        } else {
            removeWarning();
            unblockButton();
        }
    }

    // wachten tot alles geladen is
    let tries = 0;
    const interval = setInterval(() => {
        const statusExists = document.querySelector('[data-test="pack-go-order-status-filter"]');
        const paymentExists = document.querySelector('[data-test="pack-go-payment-status-filter"]');

        if (statusExists && paymentExists) {
            clearInterval(interval);

            setTimeout(() => {
                checkFilters();

                // live blijven checken
                setInterval(checkFilters, 2000);
            }, 500);
        }

        tries++;
        if (tries > 20) clearInterval(interval);
    }, 500);

})();
