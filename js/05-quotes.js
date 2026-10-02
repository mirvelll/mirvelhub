function copyTextToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast("Промпт скопирован! Вставьте его в ИИ (ChatGPT/Claude/Gemini) 📋");
        } else {
            showToast("Ошибка копирования. Выделите текст вручную.");
        }
    } catch (err) {
        showToast("Ошибка при копировании.");
    }
    document.body.removeChild(textarea);
}

function updateQuoteUI() {
    const quoteTextEl = document.getElementById('quote-text');
    const quoteAuthorEl = document.getElementById('quote-author');
    const langBtnText = document.getElementById('quote-lang-btn-text');
    if (!quoteTextEl || !quoteAuthorEl) return;

    const list = data.quotes || [];
    if (list.length === 0) {
        quoteTextEl.innerText = "У вас нет сохраненных цитат. Перейдите в Управление, чтобы добавить!";
        quoteAuthorEl.innerText = "-";
        return;
    }

    let current = list.find(q => q.id === data.currentQuoteId);
    if (!current) {
        current = list[0];
        data.currentQuoteId = current.id;
    }

    const isRu = (data.quoteLanguage === 'ru');
    let textToDisplay = isRu ? current.textTranslation : current.textOriginal;
    if (!textToDisplay) {
        textToDisplay = current.textOriginal || current.textTranslation || "Пустая цитата";
    }

    quoteTextEl.innerText = textToDisplay;

    let authorStr = current.author || "Артист";
    if (current.song) {
        authorStr += ` (трек: «${current.song}»)`;
    }
    quoteAuthorEl.innerText = `— ${authorStr}`;

    if (langBtnText) {
        langBtnText.innerText = isRu ? "Оригинал (EN)" : "Перевод (RU)";
    }
}

window.toggleQuoteLanguage = () => {
    data.quoteLanguage = (data.quoteLanguage === 'ru') ? 'en' : 'ru';
    save();
    const card = document.getElementById('quote-card-container');
    if (card) {
        card.classList.add('scale-[0.98]', 'opacity-85');
        setTimeout(() => {
            updateQuoteUI();
            card.classList.remove('scale-[0.98]', 'opacity-85');
        }, 120);
    }
};

window.getRandomQuote = () => {
    const list = data.quotes || [];
    if (list.length === 0) return;

    let filtered = list;
    if (list.length > 1) {
        filtered = list.filter(q => q.id !== data.currentQuoteId);
    }

    const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
    data.currentQuoteId = randomQuote.id;
    save();

    const card = document.getElementById('quote-card-container');
    if (card) {
        card.classList.add('opacity-0', 'translate-y-1');
        setTimeout(() => {
            updateQuoteUI();
            card.classList.remove('opacity-0', 'translate-y-1');
        }, 150);
    }
};

window.openQuotePromptModal = () => {
    const artistsInput = document.getElementById('prompt-artists-input');
    const profileArtists = (data.favoriteArtists || "").trim();
    artistsInput.value = profileArtists ? profileArtists : "Tyler, The Creator, Lana Del Rey, Kanye West, Nirvana";
    generatePromptText();
    document.getElementById('quote-prompt-modal').classList.remove('hidden');
};

window.generatePromptText = () => {
    const artists = document.getElementById('prompt-artists-input').value.trim();
    const textarea = document.getElementById('ai-prompt-textarea');

    textarea.value = `Generate a list of 5 iconic quotes or song lyrics from these artists: ${artists ? artists : 'my favorite artists'}.
For each quote, you MUST provide both the original English version and its high-quality Russian translation.
Output strictly as a raw valid JSON array, without markdown backticks block formatting, matching this schema:

[
  {
    "author": "Artist Name",
    "textOriginal": "The lyric in English",
    "textTranslation": "Перевод на русский язык",
    "song": "Song title (optional)"
  }
]`;
};

window.copyAIPrompt = () => {
    copyTextToClipboard(document.getElementById('ai-prompt-textarea').value);
};

window.switchQuoteTab = (tab) => {
    ['list', 'add', 'import'].forEach(s => {
        const btn = document.getElementById(`tab-quote-${s}`);
        const sec = document.getElementById(`quote-section-${s}`);
        if (s === tab) {
            btn.className = "flex-1 py-2 text-sm font-bold border-b-2 border-purple-500 text-white";
            sec.classList.remove('hidden');
        } else {
            btn.className = "flex-1 py-2 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-white transition";
            sec.classList.add('hidden');
        }
    });
    if (tab === 'list') renderQuotesList();
};

window.openQuotesManager = () => {
    switchQuoteTab('list');
    document.getElementById('quotes-manager-modal').classList.remove('hidden');
};

window.renderQuotesList = () => {
    const container = document.getElementById('quotes-list-container');
    const list = data.quotes || [];

    if (list.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8 text-sm italic">Список цитат пуст. Добавьте вручную или импортируйте через ИИ!</p>`;
        return;
    }

    container.innerHTML = list.map(q => `
        <div class="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-start gap-3 hover:bg-white/10 transition-colors text-xs">
            <div class="space-y-1 w-11/12">
                <p class="font-bold text-purple-300">${esc(q.author)} ${q.song ? `<span class="text-gray-500 font-normal">(трек: ${esc(q.song)})</span>` : ''}</p>
                <p class="text-gray-200 italic">🇬🇧 "${esc(q.textOriginal || '-')}"</p>
                <p class="text-gray-400 italic">🇷🇺 "${esc(q.textTranslation || '-')}"</p>
            </div>
            <button onclick="deleteQuote(${q.id})" class="text-red-400 hover:text-red-300 p-1 shrink-0 transition">✕</button>
        </div>
    `).join('');
};

window.deleteQuote = (id) => {
    data.quotes = (data.quotes || []).filter(q => q.id !== id);
    if (data.currentQuoteId === id) {
        data.currentQuoteId = data.quotes.length > 0 ? data.quotes[0].id : null;
    }
    save();
    renderQuotesList();
    showToast("Цитата удалена");
};

window.saveManualQuote = () => {
    const author = document.getElementById('manual-quote-author').value.trim();
    const song = document.getElementById('manual-quote-song').value.trim();
    const original = document.getElementById('manual-quote-original').value.trim();
    const translation = document.getElementById('manual-quote-translation').value.trim();

    if (!original && !translation) {
        showToast("Заполните тело цитаты!");
        return;
    }

    const newQuote = {
        id: Date.now(),
        author: author || "Артист",
        song: song,
        textOriginal: original,
        textTranslation: translation
    };

    data.quotes.push(newQuote);
    data.currentQuoteId = newQuote.id;
    save();

    document.getElementById('manual-quote-author').value = '';
    document.getElementById('manual-quote-song').value = '';
    document.getElementById('manual-quote-original').value = '';
    document.getElementById('manual-quote-translation').value = '';

    showToast("Цитата успешно добавлена!");
    switchQuoteTab('list');
};

window.importQuotesFromAI = () => {
    const value = document.getElementById('ai-import-textarea').value.trim();
    if (!value) return;

    try {
        const cleaned = value.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed)) {
            showToast("ИИ должен вернуть именно массив JSON!");
            return;
        }

        let count = 0;
        parsed.forEach((item, index) => {
            if (item.textOriginal || item.textTranslation) {
                data.quotes.push({
                    id: Date.now() + index,
                    author: item.author || "Артист",
                    textOriginal: item.textOriginal || "",
                    textTranslation: item.textTranslation || "",
                    song: item.song || ""
                });
                count++;
            }
        });

        if (count > 0) {
            save();
            document.getElementById('ai-import-textarea').value = '';
            showToast(`Импортировано ${count} цитат из ИИ! 🤖✨`);
            switchQuoteTab('list');
        }
    } catch (err) {
        showToast("Ошибка импорта! Убедитесь в корректности JSON формата.");
    }
};
