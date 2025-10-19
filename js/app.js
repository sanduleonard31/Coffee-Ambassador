import { jsonFetch, createElement, lazyLoadImage, isExternalUrl } from './utils.js';

// Cache DOM elements
const gallery = document.getElementById('gallery');
const MEDIA_PATH = './media/home';

// Create thumbnail element based on content
const createThumbnail = (content, base, name) => {
  const thumb = createElement('div', { className: 'thumb' });
  
  if (content.Image) {
    const img = createElement('img', {
      src: `${base}/${content.Image}`,
      alt: content.Text || name
    });
    lazyLoadImage(img);
    thumb.appendChild(img);
  } else if (content.Video) {
    const videoSrc = isExternalUrl(content.Video) ? content.Video : `${base}/${content.Video}`;
    const video = createElement('video', {
      src: videoSrc,
      controls: false,
      muted: true,
      loop: true,
      autoplay: true
    });
    thumb.appendChild(video);
  } else {
    thumb.innerHTML = '<div class="placeholder">No preview</div>';
  }
  
  return thumb;
};

// Create action buttons
const createActions = (content, base) => {
  const actions = createElement('div', { className: 'actions' });
  
  const buttons = [
    { condition: content.Link, text: 'Open link', href: content.Link, className: 'btn' },
    { condition: content.Video && isExternalUrl(content.Video), text: 'Watch video', href: content.Video, className: 'btn' },
    { condition: content.Pdf, text: 'Open PDF', href: `${base}/${content.Pdf}`, className: 'btn secondary' }
  ];
  
  buttons.forEach(({ condition, text, href, className }) => {
    if (condition) {
      const link = createElement('a', {
        className,
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        textContent: text
      });
      actions.appendChild(link);
    }
  });
  
  return actions;
};

// Load individual project card
const loadProject = async (name, section = 'home') => {
  const base = `./media/${section}/${name}`;
  const content = await jsonFetch(`${base}/content.json`);
  
  if (!content) {
    console.warn(`Missing content.json for ${name}`);
    return null;
  }

  // Create card structure
  const card = createElement('article', { className: 'card' });
  const thumb = createThumbnail(content, base, name);
  
  // Create description with line breaks, tabs, and bold formatting
  const descriptionEl = createElement('p');
  descriptionEl.innerHTML = (content.Description || '')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  
  const contentEl = createElement('div', { className: 'content' }, [
    createElement('h3', { textContent: content.Text || name }),
    createElement('div', { className: 'meta', textContent: name }),
    descriptionEl,
    createActions(content, base)
  ]);

  card.appendChild(thumb);
  card.appendChild(contentEl);
  
  return card;
};

// Load all projects from index
const loadIndex = async () => {
  const idx = await jsonFetch(`${MEDIA_PATH}/index.json`);
  
  if (!idx || !Array.isArray(idx.projects)) {
    gallery.innerHTML = '<p class="meta">No media index found. Create media/home/index.json listing folders.</p>';
    return;
  }
  
  // Clear loading message
  gallery.innerHTML = '';
  
  // Load projects with error handling
  const cardPromises = idx.projects.map(name => loadProject(name, 'home'));
  const cards = await Promise.all(cardPromises);
  
  // Append valid cards to gallery using DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  cards.forEach(card => {
    if (card) fragment.appendChild(card);
  });
  gallery.appendChild(fragment);
  
  // Show message if no cards loaded
  if (gallery.children.length === 0) {
    gallery.innerHTML = '<p class="meta">No projects available.</p>';
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', loadIndex);

export {};
