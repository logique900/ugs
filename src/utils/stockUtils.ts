import { Article } from '../types';

/**
 * Calculates the available stock for an article.
 * @param article The article object
 * @param projetId Optional project ID ('all' or undefined returns total stock across all projects)
 */
export function getArticleStock(article: Article | null | undefined, projetId?: string): number {
  if (!article) return 0;

  if (article.stocks && typeof article.stocks === 'object') {
    if (!projetId || projetId === 'all') {
      return Object.values(article.stocks).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
    }
    if (article.stocks[projetId] !== undefined) {
      return Number(article.stocks[projetId]) || 0;
    }
  }

  // Fallback to legacy stock field if stocks map is empty or undefined
  return Number((article as any).stock) || 0;
}

/**
 * Checks if an article is in low stock condition for a given project/store.
 */
export function hasLowStock(article: Article | null | undefined, projetId?: string): boolean {
  if (!article) return false;
  if (article.typeArticle === 'Service') return false;

  const stock = getArticleStock(article, projetId);
  if (stock <= 0) return false; // Rupture, not low stock

  let min = 15;
  if (article.stockMinimums && typeof article.stockMinimums === 'object') {
    if (projetId && projetId !== 'all' && article.stockMinimums[projetId] !== undefined) {
      min = Number(article.stockMinimums[projetId]);
    } else if (article.stockMinimums['1'] !== undefined) {
      min = Number(article.stockMinimums['1']);
    } else {
      const minValues = Object.values(article.stockMinimums).map(v => Number(v) || 0);
      if (minValues.length > 0) {
        min = Math.min(...minValues);
      }
    }
  } else if (article.seuilAlerte !== undefined) {
    min = Number(article.seuilAlerte);
  }

  return stock < min;
}

/**
 * Checks if an article is out of stock.
 */
export function isOutOfStock(article: Article | null | undefined, projetId?: string): boolean {
  if (!article) return true;
  if (article.typeArticle === 'Service') return false;
  return getArticleStock(article, projetId) <= 0;
}

/**
 * Updates stock for an article in a specific project/store.
 */
export function updateArticleStock(article: Article, projetId: string, delta: number): Article {
  if (article.typeArticle === 'Service') return article;

  const targetId = projetId === 'all' ? 'p1' : projetId;
  const currentStocks = { ...(article.stocks || {}) };
  const currentQty = currentStocks[targetId] !== undefined ? currentStocks[targetId] : (Number((article as any).stock) || 0);
  const newQty = Math.max(0, currentQty + delta);
  
  currentStocks[targetId] = newQty;

  const totalStock = Object.values(currentStocks).reduce((sum, qty) => sum + (Number(qty) || 0), 0);

  return {
    ...article,
    stocks: currentStocks,
    stock: totalStock
  } as Article;
}
