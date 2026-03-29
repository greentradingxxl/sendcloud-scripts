// ==UserScript==
// @name         Sendcloud → Order notes sync
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Save + load order notes
// @match        https://app.sendcloud.com/v2/shipping/packgo/queue*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function showStatus(status, text, color = 'black', autoHide = false) {
        status.innerText = text;
        status.style.color = color;
        status.style.fontWeight = '600';

        if (autoHide) {
            setTimeout(() => {
                status.innerText = '';
            }, 5000);
        }
    }

    function addUI() {
        const table = document.querySelector('[data-test="packgo-items-table"]');
        if (!table) return;

        if (document.getElementById('sc-note-box')) return;

        const orderEl = document.querySelector('[data-test="packgo-order-header-order-number"]');
        const orderNumber = orderEl ? orderEl.innerText.trim() : '';

        if (!orderNumber) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sc-note-box';
        wrapper.style.marginTop = '15px';
        wrapper.style.padding = '12px';
        wrapper.style.border = '1px solid #ddd';
        wrapper.style.borderRadius = '6px';
        wrapper.style.background = '#fafafa';

        const label = document.createElement('div');
        label.innerText = 'Opmerking en/of serienummer: (' + orderNumber + ')';
        label.style.fontWeight = '600';
        label.style.marginBottom = '8px';

        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '70px';
        textarea.style.padding = '8px';
        textarea.style.marginBottom = '10px';
        textarea.placeholder = 'Bijv. serienummer en/of iets om te onthouden';

        const button = document.createElement('button');
        button.innerText = 'Opslaan';
        button.style.padding = '8px 12px';
        button.style.background = '#1f8fff';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';

        const status = document.createElement('div');
        status.style.marginTop = '8px';

        // 🔥 NOTE OPHALEN
        async function loadNote() {
            try {
                const response = await fetch(
                    `https://www.greentradingxxl.com/wp-json/sendcloud-note/v1/get-note?orderNumber=${orderNumber}`
                );

                const data = await response.json();

                if (!response.ok) {
                    showStatus(status, data.message || 'Toegang geweigerd', 'red');
                    return;
                }

                if (data.success) {
                    textarea.value = data.note || '';
                }

            } catch (e) {
                showStatus(status, 'Netwerk fout', 'red');
            }
        }

        // 🔥 OPSLAAN
        button.addEventListener('click', async () => {
            const note = textarea.value.trim();

            try {
                const response = await fetch(
                    'https://www.greentradingxxl.com/wp-json/sendcloud-note/v1/save',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            orderNumber: orderNumber,
                            note: note
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    showStatus(status, data.message || 'Toegang geweigerd', 'red');
                    return;
                }

                if (data.success) {
                    showStatus(status, '✔️ Opgeslagen', 'green', true);
                } else {
                    showStatus(status, 'Fout: ' + data.message, 'red');
                }

            } catch (e) {
                showStatus(status, 'Netwerk fout', 'red');
            }
        });

        wrapper.appendChild(label);
        wrapper.appendChild(textarea);
        wrapper.appendChild(button);
        wrapper.appendChild(status);

        table.parentElement.appendChild(wrapper);

        loadNote();
    }

    setInterval(addUI, 800);
})();
