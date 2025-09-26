import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 📋 MENU DATA API ENDPOINT
 * 
 * Sirve datos del menú con caching y filtros
 * Implementa Repository Pattern + Caching Pattern
 */

interface MenuItemData {
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  available: boolean;
  nutritional_info?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MenuResponse {
  items: MenuItemData[];
  categories: string[];
  total_items: number;
  last_updated: string;
}

// 🔄 Caching Pattern: Cache en memoria para datos del menú
let menuCache: MenuResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const available = searchParams.get('available');
    const limit = searchParams.get('limit');

    // 📦 Caching Pattern: Verificar cache
    const now = Date.now();
    if (menuCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('[MENU-DATA] Serving from cache');
      return serveMenuData(menuCache, { category, available, limit });
    }

    // 📁 Repository Pattern: Cargar datos del archivo
    const menuFilePath = join(process.cwd(), 'public', 'menu-data.json');
    const menuFileContent = await readFile(menuFilePath, 'utf-8');
    const menuData = JSON.parse(menuFileContent);

    // 🏗️ Builder Pattern: Construir respuesta estructurada
    const menuItems: MenuItemData[] = Object.entries(menuData.items).map(([name, item]) => {
      const menuItem = item as Record<string, unknown>;
      return {
        name,
        price: menuItem.price as number,
        description: menuItem.description as string,
        category: menuItem.category as string,
        image: menuData.images[name] || '/images/menu/default.png',
        available: menuItem.available !== false, // Por defecto disponible
        nutritional_info: menuItem.nutritional_info as { calories: number; protein: number; carbs: number; fat: number; }
      };
    });

    // 📊 Category Extraction Pattern: Extraer categorías únicas
    const categories = [...new Set(menuItems.map(item => item.category))];

    const menuResponse: MenuResponse = {
      items: menuItems,
      categories,
      total_items: menuItems.length,
      last_updated: new Date().toISOString()
    };

    // 💾 Actualizar cache
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

// 🔍 Filter Application Pattern: Aplicar filtros a los datos del menú
function serveMenuData(
  menuData: MenuResponse, 
  filters: { category?: string | null, available?: string | null, limit?: string | null }
) {
  let filteredItems = [...menuData.items];

  // 🎯 Category Filter
  if (filters.category) {
    filteredItems = filteredItems.filter(item => 
      item.category.toLowerCase() === filters.category!.toLowerCase()
    );
  }

  // ✅ Availability Filter
  if (filters.available === 'true') {
    filteredItems = filteredItems.filter(item => item.available);
  } else if (filters.available === 'false') {
    filteredItems = filteredItems.filter(item => !item.available);
  }

  // 📊 Limit Results
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

// 🔄 Cache Management Pattern: Endpoint para limpiar cache
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

// 📊 Metrics Pattern: Endpoint para estadísticas del menú
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'stats') {
      // 📈 Generar estadísticas del menú
      if (!menuCache) {
        // Cargar datos si no están en cache
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
