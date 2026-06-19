// ==UserScript==
// @name         Sendcloud → Order notes sync
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Save + load order notes
// @match        https://app.sendcloud.com/*
// @grant        GM_xmlhttpRequest
// @connect      www.greentradingxxl.com
// ==/UserScript==

(function () {
    'use strict';

    // 🔒 voorkomt dubbel laden
    if (window.scNoteLoaded) return;
    window.scNoteLoaded = true;

    function isCorrectPage() {
        return window.location.pathname === '/v2/shipping/packgo/queue';
    }

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

    function removeUI() {
        const existing = document.getElementById('sc-note-box');
        if (existing) existing.remove();
    }

    // Kleine wrapper om GM_xmlhttpRequest te laten lijken op fetch().then(r => r.json())
    function gmFetchJson(method, url, body) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                data: body ? JSON.stringify(body) : undefined,
                onload: function (response) {
                    let data;
                    try {
                        data = JSON.parse(response.responseText);
                    } catch (e) {
                        reject(new Error('Ongeldig antwoord van server'));
                        return;
                    }
                    resolve({ ok: response.status >= 200 && response.status < 300, status: response.status, data });
                },
                onerror: function () {
                    reject(new Error('Netwerk fout'));
                },
                ontimeout: function () {
                    reject(new Error('Timeout'));
                }
            });
        });
    }

    function createUI() {
        if (!isCorrectPage()) {
            removeUI();
            return;
        }

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
                const url = `https://www.greentradingxxl.com/wp-json/sendcloud-note/v1/get-note?orderNumber=${encodeURIComponent(orderNumber)}`;
                const response = await gmFetchJson('GET', url);

                if (!response.ok) {
                    showStatus(status, response.data.message || 'Toegang geweigerd', 'red');
                    return;
                }

                textarea.value = response.data.note || '';

            } catch (e) {
                showStatus(status, 'Netwerk fout', 'red');
            }
        }

        // 🔥 OPSLAAN (ook leeg = verwijderen)
        button.addEventListener('click', async () => {
            const note = textarea.value.trim();

            try {
                const url = 'https://www.greentradingxxl.com/wp-json/sendcloud-note/v1/save';
                const response = await gmFetchJson('POST', url, {
                    orderNumber: orderNumber,
                    note: note
                });

                if (!response.ok) {
                    showStatus(status, response.data.message || 'Toegang geweigerd', 'red');
                    return;
                }

                if (response.data.deleted) {
                    showStatus(status, '✔️ Opmerking verwijderd', 'green', true);
                } else if (response.data.success) {
                    showStatus(status, '✔️ Opgeslagen', 'green', true);
                } else {
                    showStatus(status, 'Fout: ' + response.data.message, 'red');
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

    // 🔁 observer i.p.v. setInterval
    const observer = new MutationObserver(() => {
        createUI();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
