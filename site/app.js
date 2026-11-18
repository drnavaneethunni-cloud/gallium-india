import {filterCategories, findParts, normalize} from './search.mjs';
import {brochures, getBrochurePage} from './brochures.mjs';
import {initBrochureViewer} from './brochure-viewer.mjs';
import {reducedMotion} from './motion.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let products = [], parts = [], mode = 'parts', group = 'All filters', expanded = false;
let catalogueState = 'loading', partsState = 'loading', submittedPart = '';
const queries = {parts: '', filters: ''};
const groups = ['All filters', 'Air, intake & dust', 'Fuel & separation', 'Oil, hydraulic & transmission', 'Compressed air, emissions & cabin', 'Bulk, water & industrial', 'Accessories & kits'];
const input = $('#search');

function el(tag, cls, text) {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (text !== undefined) element.textContent = text;
  return element;
}
function goTo(element, focus = false) {
  element.scrollIntoView({behavior: reducedMotion() ? 'instant' : 'smooth', block: 'start'});
  if (focus) element.focus({preventScroll: true});
}
function enquire(reference) {
  $('#enquiry').hidden = false;
  $('#enquiry-part').value = reference;
  goTo($('#enquiry'));
  $('#enquiry-part').focus({preventScroll: true});
}
function sourceLink(reference, className = 'source-card') {
  const page = getBrochurePage(reference.brochure, reference.page);
  const link = el('a', className);
  link.href = page.pdf;
  link.dataset.brochure = reference.brochure;
  link.dataset.page = String(reference.page);
  const image = el('img');
  image.src = page.thumbnail;
  image.alt = '';
  image.loading = 'lazy';
  image.width = 260;
  image.height = 368;
  const text = el('span', 'source-card-text');
  text.append(el('strong', '', reference.label), el('span', '', `${brochures[reference.brochure].title} · p. ${reference.page}`), el('b', '', 'View page →'));
  link.append(image, text);
  return link;
}
function showProduct(product) {
  const content = $('#dialog-content');
  content.replaceChildren();
  const overview = el('div', 'product-detail-overview');
  const visual = el('figure', 'detail-visual');
  const image = el('img', 'dialog-image');
  if (product.image) {
    image.src = 'assets/' + product.image;
    image.alt = product.name + ' category reference';
    visual.append(image, el('figcaption', '', 'Category reference image'));
  } else {
    const page = getBrochurePage('product', product.cataloguePage);
    image.src = page.thumbnail;
    image.alt = `Product brochure page ${product.cataloguePage}, including ${product.name}`;
    visual.classList.add('detail-page-preview');
    visual.append(image, el('figcaption', '', `Category overview · brochure p. ${product.cataloguePage}`));
  }
  const copy = el('div', 'detail-copy');
  copy.append(el('p', 'eyebrow', product.group), Object.assign(el('h2', '', product.name), {id: 'dialog-title'}), el('p', '', product.description), el('h3', '', 'What to confirm'));
  const list = el('ul');
  product.checks.forEach(check => list.append(el('li', '', check)));
  copy.append(list);
  const button = el('button', 'button', 'Enquire about this filter →');
  button.onclick = () => { $('#product-dialog').close(); enquire(product.name); };
  copy.append(button);
  overview.append(visual, copy);
  const sources = el('div', 'detail-sources');
  sources.append(el('h3', '', 'See it in the catalogues'));
  const references = el('div', 'source-grid');
  product.references.forEach(reference => references.append(sourceLink(reference)));
  sources.append(references);
  const selection = el('a', 'selection-reference', 'How to confirm fit · Technical brochure p. 2 →');
  selection.href = getBrochurePage('technical', 2).pdf;
  selection.dataset.brochure = 'technical';
  selection.dataset.page = '2';
  const note = el('p', 'detail-note', 'Images and catalogue artwork illustrate the range. Dimensions, materials and performance depend on the part number and application. Confirm the exact fit before ordering.');
  content.append(overview, sources, selection, note);
  $('#product-dialog').showModal();
}
function card(product) {
  const button = el('button', 'product-card');
  button.setAttribute('aria-label', 'View ' + product.name);
  const visual = el('span', 'product-photo');
  visual.append(el('span', 'category-index', String(product.id).padStart(2, '0')));
  const image = el('img');
  image.alt = '';
  image.loading = 'lazy';
  if (product.image) {
    image.src = 'assets/' + product.image;
  } else {
    visual.classList.add('catalogue-page-photo');
    image.src = getBrochurePage('product', product.cataloguePage).thumbnail;
    image.width = 260;
    image.height = 368;
    visual.append(el('span', 'catalogue-image-label', 'Catalogue page'));
  }
  visual.append(image);
  const body = el('span', 'product-body');
  body.append(el('span', '', product.group), el('span', 'category-title', product.name), el('span', 'category-description', product.description), el('b', '', 'Details & catalogue →'));
  button.append(visual, body);
  button.onclick = () => showProduct(product);
  return button;
}
function renderSuggestions() {
  const box = $('#search-suggestions');
  box.replaceChildren();
  const query = queries.filters.trim();
  const matches = mode === 'filters' && query && catalogueState === 'ready'
    ? filterCategories(products, {query}).slice(0, 4) : [];
  box.hidden = !matches.length;
  if (!matches.length) return;
  box.append(el('p', '', 'MATCHING FILTER TYPES'));
  matches.forEach(product => {
    const button = el('button');
    button.type = 'button';
    button.append(el('span', '', product.name), el('span', '', 'Details →'));
    button.onclick = () => showProduct(product);
    box.append(button);
  });
}
function renderCategories() {
  renderSuggestions();
  $$('[data-app]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.app === $('#application').value)));
  const grid = $('#product-grid');
  grid.replaceChildren();
  $('#show-all').hidden = true;
  if (catalogueState === 'loading') {
    $('#result-count').textContent = 'Loading filter categories…';
    return;
  }
  if (catalogueState === 'error') {
    $('#result-count').textContent = 'The filter range could not load.';
    const message = el('div', 'empty');
    message.append(el('p', '', 'Please reload, or explore the product brochure.'));
    const brochure = el('a', 'text-link', 'Open product brochure →');
    brochure.href = 'downloads/gallium-product-brochure.pdf';
    message.append(brochure);
    grid.append(message);
    return;
  }
  const query = mode === 'filters' ? queries.filters : '';
  const application = $('#application').value;
  const filtered = filterCategories(products, {query, group, application});
  const shown = expanded || query || group !== 'All filters' || application !== 'all' ? filtered : filtered.slice(0, 8);
  $('#result-count').textContent = `Showing ${shown.length} of ${filtered.length} filter categories`;
  shown.forEach(product => grid.append(card(product)));
  if (!filtered.length) {
    const message = el('div', 'empty');
    message.append(el('h3', '', 'Let’s find the right match.'), el('p', '', 'Try a broader filter name, reset the filters, or ask the team.'));
    const button = el('button', 'button', 'Ask about this filter →');
    button.onclick = () => enquire(query);
    message.append(button);
    grid.append(message);
  }
  $('#show-all').hidden = shown.length >= filtered.length;
}
function updateSearchControls() {
  const isParts = mode === 'parts';
  $$('[data-mode]').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  input.placeholder = isParts ? 'Part number or OEM reference' : 'Search air, fuel, hydraulic…';
  input.required = isParts;
  input.setAttribute('autocapitalize', isParts ? 'characters' : 'none');
  $('label[for="search"]').textContent = isParts ? 'Find your Gallium filter' : 'Search filter types';
  $('#search-help').textContent = isParts
    ? (partsState === 'ready' && parts.length ? 'Use a Gallium, OEM or competitor reference. Spaces and hyphens are ignored.' : 'Part matching currently continues in Gallium’s global catalogue.')
    : 'Search the range by filter name or application. Results update as you type.';
  $('#clear-search').hidden = !input.value;
}
function renderPartResults() {
  const section = $('#part-results');
  section.hidden = mode !== 'parts' || !submittedPart;
  if (section.hidden) return;
  const title = $('#part-results-title'), notice = $('#part-notice'), grid = $('#part-grid');
  notice.replaceChildren(); grid.replaceChildren();
  if (partsState === 'loading') {
    title.textContent = 'Checking your reference…';
    $('#search-status').textContent = title.textContent;
    return;
  }
  const matches = partsState === 'ready' ? findParts(parts, submittedPart) : [];
  if (matches.length) {
    title.textContent = `${matches.length} exact ${matches.length === 1 ? 'match' : 'matches'} for “${submittedPart}”`;
    matches.forEach(part => {
      const item = el('article', 'part-card');
      item.append(el('p', 'eyebrow', 'GALLIUM PART'), el('h3', '', part.partNumber), el('p', '', part.name));
      const button = el('button', 'button', 'Request quotation →');
      button.onclick = () => enquire(part.partNumber);
      item.append(button); grid.append(item);
    });
    notice.append(el('p', '', 'Confirm dimensions, connections and application before ordering.'));
  } else {
    title.textContent = partsState === 'ready' && parts.length ? 'No exact match in this catalogue' : 'Continue your part search';
    const reference = el('p', 'searched-reference');
    reference.append(el('span', '', 'Your reference'), el('strong', '', submittedPart));
    notice.append(reference, el('p', '', 'Look up this reference in Gallium’s global catalogue, or ask the team to confirm the match.'));
    const actions = el('div', 'part-actions');
    const link = el('a', 'button', 'Open global catalogue →');
    link.href = 'https://galliumfilters.com/catalogue';
    link.target = '_blank'; link.rel = 'noopener';
    const copy = el('button', 'secondary-button', 'Copy reference');
    const referenceToCopy = submittedPart;
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(referenceToCopy);
        copy.textContent = 'Copied';
        $('#search-status').textContent = 'Reference copied. Paste it into the global catalogue.';
      } catch {
        copy.textContent = 'Select the reference above to copy';
        $('#search-status').textContent = 'Copy is unavailable. Select the reference above and copy it manually.';
      }
    };
    const ask = el('button', 'plain', 'Ask Gallium to match this part →');
    ask.onclick = () => enquire(referenceToCopy);
    actions.append(copy, link, ask); notice.append(actions);
  }
  $('#search-status').textContent = title.textContent;
}
function setMode(next) {
  queries[mode] = input.value;
  mode = next;
  input.value = queries[mode];
  input.setCustomValidity('');
  $('#search-status').textContent = '';
  updateSearchControls(); renderPartResults(); renderCategories();
}
function resetCategoryFilters() {
  group = 'All filters'; expanded = false; $('#application').value = 'all';
  $$('#groups button').forEach(button => {
    const active = button.textContent === group;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
}
function browse(query = '') {
  $('#catalogue').hidden = false;
  setMode('filters');
  input.value = query; queries.filters = query;
  resetCategoryFilters(); updateSearchControls(); renderCategories();
  goTo($('#catalogue-title'), true);
}

groups.forEach(name => {
  const button = el('button', name === group ? 'active' : '', name);
  button.setAttribute('aria-pressed', String(name === group));
  button.onclick = () => {
    group = name;
    $$('#groups button').forEach(item => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    renderCategories();
  };
  $('#groups').append(button);
});
$$('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));
$$('[data-query]').forEach(button => button.onclick = () => browse(button.dataset.query));
$$('[data-browse]').forEach(link => link.onclick = event => {event.preventDefault(); browse();});
$$('[data-find]').forEach(link => link.onclick = event => {
  event.preventDefault(); setMode('parts'); goTo($('#find-filter')); input.focus({preventScroll: true});
});
input.addEventListener('input', () => {
  input.setCustomValidity(''); queries[mode] = input.value;
  if (mode === 'parts') submittedPart = '';
  $('#search-status').textContent = '';
  updateSearchControls(); renderPartResults();
  if (mode === 'filters') { $('#catalogue').hidden = false; renderCategories(); }
});
$('#clear-search').onclick = () => {
  input.value = ''; queries[mode] = ''; submittedPart = ''; input.setCustomValidity('');
  updateSearchControls(); renderPartResults(); renderCategories(); input.focus();
};
$('#search-form').onsubmit = event => {
  event.preventDefault();
  if (mode === 'parts') {
    if (!normalize(input.value)) {input.setCustomValidity('Enter a part number with letters or numbers.'); input.reportValidity(); return;}
    submittedPart = input.value.trim(); renderPartResults(); goTo($('#part-results-title'), true);
  } else {
    $('#catalogue').hidden = false;
    renderCategories(); goTo($('#catalogue-title'), true);
  }
};
$('#edit-reference').onclick = () => {goTo($('#find-filter')); input.focus({preventScroll: true});};
$('#application').onchange = renderCategories;
$('#show-all').onclick = () => {expanded = true; renderCategories();};
$('#reset').onclick = () => {
  resetCategoryFilters(); queries.filters = '';
  if (mode === 'filters') {input.value = ''; updateSearchControls();}
  renderCategories();
};
$$('[data-app]').forEach(button => button.onclick = () => {
  browse(); $('#application').value = button.dataset.app; renderCategories();
});
$$('.dialog-close').forEach(button => button.onclick = () => button.closest('dialog').close());
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
$('#privacy-open').onclick = () => $('#privacy-dialog').showModal();
$('#year').textContent = new Date().getFullYear();
$('#enquiry-form').onsubmit = event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const body = `India filtration enquiry\n\nName: ${form.get('name')}\nEmail: ${form.get('email')}\nCompany / city: ${form.get('company')}\nPart / filter: ${form.get('part')}\nQuantity: ${form.get('quantity')}\nEquipment / requirements: ${form.get('details')}`;
  location.href = `mailto:hello@galliumfilters.com?subject=${encodeURIComponent('India enquiry — ' + form.get('part'))}&body=${encodeURIComponent(body)}`;
  $('#enquiry-status').textContent = 'Your email draft is ready to open. If no email app opens, email hello@galliumfilters.com with these details. Your enquiry has not been sent by this website.';
};

initBrochureViewer();
updateSearchControls(); renderCategories();
async function loadRecords(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error('Could not load ' + file);
  const records = await response.json();
  if (!Array.isArray(records)) throw new Error('Invalid catalogue data');
  return records;
}
loadRecords('catalogue.json').then(data => {products = data; catalogueState = 'ready';})
  .catch(() => {catalogueState = 'error';}).finally(renderCategories);
loadRecords('parts.json').then(data => {parts = data; partsState = 'ready';})
  .catch(() => {partsState = 'error';}).finally(() => {updateSearchControls(); renderPartResults();});

const navToggle = $('#nav-toggle');
const nav = $('#main-nav');
function closeNavigation() {
  nav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}
navToggle.onclick = () => {
  const open = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(open));
};
$$('#main-nav a').forEach(link => link.addEventListener('click', closeNavigation));
$('header').addEventListener('keydown', event => {
  if (event.key === 'Escape') {closeNavigation(); navToggle.focus();}
});
matchMedia('(max-width:700px)').addEventListener('change', updateSearchControls);


// The homepage introduces the range; the complete explorer opens when requested.
$$('[data-category-id]').forEach(button => button.addEventListener('click', () => {
  const product = products.find(item => String(item.id) === button.dataset.categoryId);
  if (product) showProduct(product);
  else browse(button.dataset.fallbackQuery);
}));
$$('[data-enquiry-open]').forEach(button => button.addEventListener('click', () => {
  $('#enquiry').hidden = false;
  goTo($('#enquiry'));
  $('#enquiry-form input[name="name"]').focus({preventScroll: true});
}));
$('#close-catalogue').addEventListener('click', () => {
  $('#catalogue').hidden = true;
  goTo($('#range'));
  $('[data-browse]').focus({preventScroll: true});
});
function revealLinkedSection() {
  if (['#catalogue', '#catalogue-title'].includes(location.hash)) {
    $('#catalogue').hidden = false;
    goTo($('#catalogue'));
  }
  if (location.hash === '#enquiry') {
    $('#enquiry').hidden = false;
    goTo($('#enquiry'));
  }
}
window.addEventListener('hashchange', revealLinkedSection);
revealLinkedSection();
$$('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => document.body.classList.toggle('modal-open', !!$('dialog[open]')));
});
const modalObserver = new MutationObserver(() => document.body.classList.toggle('modal-open', !!$('dialog[open]')));
$$('dialog').forEach(dialog => modalObserver.observe(dialog, {attributes:true, attributeFilter:['open']}));
