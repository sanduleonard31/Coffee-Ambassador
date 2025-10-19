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

// Create tabs for projects with subfolders
const createTabs = (subfolders, parentName, section, card) => {
  const tabsContainer = createElement('div', { className: 'tabs-container' });
  const tabButtons = createElement('div', { className: 'tab-buttons' });
  
  subfolders.forEach((subfolder, index) => {
    const btn = createElement('button', {
      className: index === 0 ? 'tab-btn active' : 'tab-btn',
      textContent: subfolder,
      'data-subfolder': subfolder
    });
    
    btn.addEventListener('click', async (e) => {
      // Remove active class from all tabs
      tabButtons.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      // Add active class to clicked tab
      e.target.classList.add('active');
      
      // Load the selected subfolder content
      const base = `./media/${section}/${parentName}/${subfolder}`;
      const content = await jsonFetch(`${base}/content.json`);
      
      if (content) {
        // Update the card content
        const thumb = card.querySelector('.thumb');
        const contentEl = card.querySelector('.content');
        
        // Update thumbnail
        const newThumb = createThumbnail(content, base, subfolder);
        thumb.replaceWith(newThumb);
        
        // Update description
        const descriptionEl = contentEl.querySelector('p');
        if (descriptionEl) {
          descriptionEl.innerHTML = (content.Description || '')
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        }
        
        // Update meta
        const metaEl = contentEl.querySelector('.meta');
        if (metaEl) {
          metaEl.textContent = `${parentName} — ${subfolder}`;
        }
        
        // Update actions
        const actionsEl = contentEl.querySelector('.actions');
        if (actionsEl) {
          const newActions = createActions(content, base);
          actionsEl.replaceWith(newActions);
        }
      }
    });
    
    tabButtons.appendChild(btn);
  });
  
  tabsContainer.appendChild(tabButtons);
  return tabsContainer;
};

// Load individual project card
const loadProject = async (name, section = 'home') => {
  const base = `./media/${section}/${name}`;
  const content = await jsonFetch(`${base}/content.json`);
  
  if (!content) {
    console.warn(`Missing content.json for ${name}`);
    return null;
  }

  // Check if this is a project with subfolders
  const hasSubfolders = content.subfolders && Array.isArray(content.subfolders) && content.subfolders.length > 0;
  
  let actualContent = content;
  let actualBase = base;
  let displayName = name;
  
  // If has subfolders, load the first subfolder's content
  if (hasSubfolders) {
    const firstSubfolder = content.subfolders[0];
    actualBase = `${base}/${firstSubfolder}`;
    actualContent = await jsonFetch(`${actualBase}/content.json`) || content;
    displayName = `${name} — ${firstSubfolder}`;
  }

  // Create card structure
  const card = createElement('article', { className: 'card' });
  const thumb = createThumbnail(actualContent, actualBase, displayName);
  
  // Create description with line breaks, tabs, and bold formatting
  const descriptionEl = createElement('p');
  descriptionEl.innerHTML = (actualContent.Description || '')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  
  const contentEl = createElement('div', { className: 'content' }, [
      createElement('h3', { textContent: name }),
    hasSubfolders ? createTabs(content.subfolders, name, section, card) : null,
    createElement('div', { className: 'meta', textContent: displayName }),
    descriptionEl,
    createActions(actualContent, actualBase)
  ].filter(Boolean));

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
