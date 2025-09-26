import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * MENU DATA API ENDPOINT
 * 
 * This endpoint serves menu data with in-memory caching and supports filtering.
 * Implements Repository Pattern and Caching Pattern.
 */

/**
 * Represents a single menu item.
 */
interface MenuItemData {
  /** Name of the menu item */
  name: string;
  /** Price of the menu item */
  price: number;
  /** Description of the menu item */
  description: string;
  /** Category to which the menu item belongs */
  category: string;
  /** Image URL for the menu item */
  image: string;
  /** Whether the menu item is currently available */
  available: boolean;
  /** Optional nutritional information for the menu item */
  nutritional_info?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Structure of the menu response returned by the API.
 */
interface MenuResponse {
  /** Array of menu items */
  items: MenuItemData[];
  /** List of unique categories present in the menu */
  categories: string[];
  /** Total number of items in the response */
  total_items: number;
  /** ISO timestamp of when the data was last updated */
  last_updated: string;
}

/**
 * In-memory cache for menu data.
 * The cache is valid for CACHE_DURATION milliseconds.
 */
let menuCache: MenuResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/menu-data
 * 
 * Returns menu data, optionally filtered by category, availability, and limit.
 * Uses in-memory cache for performance.
 * 
 * Query Parameters:
 * - category: string (optional) - filter by category
 * - available: 'true' | 'false' (optional) - filter by availability
 * - limit: string (optional) - limit the number of results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const available = searchParams.get('available');
    const limit = searchParams.get('limit');

    // Check if cache is valid
    const now = Date.now();
    if (menuCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('[MENU-DATA] Serving from cache');
      return serveMenuData(menuCache, { category, available, limit });
    }

    // Load menu data from file
    const menuFilePath = join(process.cwd(), 'public', 'menu-data.json');
    const menuFileContent = await readFile(menuFilePath, 'utf-8');
    const menuData = JSON.parse(menuFileContent);

    // Build menu items array
    const menuItems: MenuItemData[] = Object.entries(menuData.items).map(([name, item]) => {
      const menuItem = item as Record<string, unknown>;
      return {
        name,
        price: menuItem.price as number,
        description: menuItem.description as string,
        category: menuItem.category as string,
        image: menuData.images[name] || '/images/menu/default.png',
        available: menuItem.available !== false, // Default to available if not specified
        nutritional_info: menuItem.nutritional_info as { calories: number; protein: number; carbs: number; fat: number; }
      };
    });

    // Extract unique categories
    const categories = [...new Set(menuItems.map(item => item.category))];

    const menuResponse: MenuResponse = {
      items: menuItems,
      categories,
      total_items: menuItems.length,
      last_updated: new Date().toISOString()
    };

    // Update cache
    menuCache = menuResponse;
    cacheTimestamp = now;

    console.log(`[MENU-DATA] Loaded ${menuItems.length} items, ${categories.length} categories`);

    return serveMenuData(menuResponse, { category, available, limit });

  } catch (error) {
    console.error('[MENU-DATA] Error loading menu data:', error);
    return NextResponse.json(
      { error: 'Failed to load menu data' },
      { status: 500 }
    );
  }
}

/**
 * Applies filters to the menu data and returns a filtered response.
 * 
 * @param menuData - The full menu data to filter.
 * @param filters - Filtering options: category, available, limit.
 * @returns NextResponse containing the filtered menu data.
 */
function serveMenuData(
  menuData: MenuResponse, 
  filters: { category?: string | null, available?: string | null, limit?: string | null }
) {
  let filteredItems = [...menuData.items];

  // Filter by category if specified
  if (filters.category) {
    filteredItems = filteredItems.filter(item => 
      item.category.toLowerCase() === filters.category!.toLowerCase()
    );
  }

  // Filter by availability if specified
  if (filters.available === 'true') {
    filteredItems = filteredItems.filter(item => item.available);
  } else if (filters.available === 'false') {
    filteredItems = filteredItems.filter(item => !item.available);
  }

  // Limit the number of results if specified
  if (filters.limit) {
    const limitNum = parseInt(filters.limit, 10);
    if (!isNaN(limitNum) && limitNum > 0) {
      filteredItems = filteredItems.slice(0, limitNum);
    }
  }

  const response: MenuResponse = {
    items: filteredItems,
    categories: menuData.categories,
    total_items: filteredItems.length,
    last_updated: menuData.last_updated
  };

  return NextResponse.json(response);
}

/**
 * DELETE /api/menu-data
 * 
 * Clears the in-memory menu cache.
 * 
 * @returns JSON response indicating cache was cleared.
 */
export async function DELETE() {
  try {
    menuCache = null;
    cacheTimestamp = 0;
    
    console.log('[MENU-DATA] Cache cleared');
    
    return NextResponse.json({ 
      message: 'Menu cache cleared successfully',
      cleared_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MENU-DATA] Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/menu-data
 * 
 * Supports menu statistics via action: 'stats'.
 * Returns statistics about the menu, such as total items, category breakdown, and price range.
 * 
 * Request body:
 * {
 *   action: 'stats'
 * }
 * 
 * @param request - NextRequest containing the action in the body.
 * @returns JSON response with menu statistics or error.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'stats') {
      // Generate menu statistics
      if (!menuCache) {
        // Load data if not cached
        await GET(request);
      }

      if (menuCache) {
        const stats = {
          total_items: menuCache.total_items,
          categories: menuCache.categories.length,
          available_items: menuCache.items.filter(item => item.available).length,
          unavailable_items: menuCache.items.filter(item => !item.available).length,
          price_range: {
            min: Math.min(...menuCache.items.map(item => item.price)),
            max: Math.max(...menuCache.items.map(item => item.price)),
            average: menuCache.items.reduce((sum, item) => sum + item.price, 0) / menuCache.items.length
          },
          categories_breakdown: menuCache.categories.map(category => ({
            name: category,
            count: menuCache!.items.filter(item => item.category === category).length
          }))
        };

        return NextResponse.json(stats);
      }
    }

    return NextResponse.json(
      { error: 'Invalid action or no data available' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[MENU-DATA] Error generating stats:', error);
    return NextResponse.json(
      { error: 'Failed to generate menu stats' },
      { status: 500 }
    );
  }
}
