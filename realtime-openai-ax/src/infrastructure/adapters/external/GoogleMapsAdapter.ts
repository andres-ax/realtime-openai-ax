/**
 * 🏗️ PATRÓN: Adapter Pattern + External API Integration
 * 🎯 PRINCIPIO: Google Maps API + Geolocation + Address Validation
 * 
 * GoogleMapsAdapter - Adaptador para integración completa con Google Maps API
 * Maneja geocodificación, validación de direcciones, cálculo de rutas y estimación de tiempos
 */

import type { DeliveryAddress } from '../../../domain/valueObjects/DeliveryAddress';

/**
 * 🎯 PATRÓN: Google Maps Adapter Pattern
 * GoogleMapsAdapter integra funcionalidades completas de Google Maps
 */
export class GoogleMapsAdapter {
  private isInitialized = false;
  private googleMaps: typeof google.maps | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración de Google Maps
   */
  constructor(private readonly config: GoogleMapsConfig) {
    this.config = {
      region: 'US',
      language: 'en',
      enablePlaces: true,
      enableDirections: true,
      enableGeocoding: true,
      defaultZoom: 15,
      restrictCountries: [],
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar adaptador de Google Maps
   */
  public async initialize(): Promise<GoogleMapsInitResult> {
    try {
      if (this.isInitialized) {
        return { success: true, message: 'Already initialized' };
      }

      // 1. Verificar API key
      if (!this.config.apiKey) {
        return {
          success: false,
          error: 'Google Maps API key is required'
        };
      }

      // 2. Cargar Google Maps API
      const loadResult = await this.loadGoogleMapsAPI();
      if (!loadResult.success) {
        return loadResult;
      }

      // 3. Inicializar servicios
      this.initializeServices();

      this.isInitialized = true;

      this.emitEvent('maps.initialized', {
        apiKey: this.config.apiKey.substring(0, 8) + '...',
        services: this.getAvailableServices(),
        timestamp: Date.now()
      });

      return {
        success: true,
        message: 'Google Maps adapter initialized successfully',
        services: this.getAvailableServices()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize Google Maps adapter'
      };
    }
  }

  /**
   * 🗺️ PATRÓN: Geocoding Pattern
   * Geocodificar dirección a coordenadas
   */
  public async geocodeAddress(address: string): Promise<GeocodingResult> {
    try {
      if (!this.isInitialized || !this.geocoder) {
        return {
          success: false,
          error: 'Google Maps not initialized or geocoding not available'
        };
      }

      const request: google.maps.GeocoderRequest = {
        address,
        region: this.config.region,
        language: this.config.language
      };

      // Aplicar restricciones de país si están configuradas
      if (this.config.restrictCountries && this.config.restrictCountries.length > 0) {
        request.componentRestrictions = {
          country: this.config.restrictCountries[0]
        };
      }

      const response = await new Promise<google.maps.GeocoderResponse>((resolve, reject) => {
        this.geocoder!.geocode(request, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results) {
            resolve({ results });
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (!response.results || response.results.length === 0) {
        return {
          success: false,
          error: 'No results found for the provided address'
        };
      }

      const result = response.results[0];
      const location = result.geometry.location;

      const geocodingResult: GeocodingData = {
        formattedAddress: result.formatted_address,
        coordinates: {
          latitude: location.lat(),
          longitude: location.lng()
        },
        placeId: result.place_id,
        addressComponents: this.parseAddressComponents(result.address_components),
        locationType: result.geometry.location_type,
        viewport: {
          northeast: {
            latitude: result.geometry.viewport.getNorthEast().lat(),
            longitude: result.geometry.viewport.getNorthEast().lng()
          },
          southwest: {
            latitude: result.geometry.viewport.getSouthWest().lat(),
            longitude: result.geometry.viewport.getSouthWest().lng()
          }
        }
      };

      this.emitEvent('address.geocoded', {
        originalAddress: address,
        result: geocodingResult,
        timestamp: Date.now()
      });

      return {
        success: true,
        data: geocodingResult
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Geocoding failed'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Reverse Geocoding Pattern
   * Geocodificación inversa de coordenadas a dirección
   */
  public async reverseGeocode(coordinates: Coordinates): Promise<ReverseGeocodingResult> {
    try {
      if (!this.isInitialized || !this.geocoder) {
        return {
          success: false,
          error: 'Google Maps not initialized or geocoding not available'
        };
      }

      const latLng = new google.maps.LatLng(coordinates.latitude, coordinates.longitude);
      
      const response = await new Promise<google.maps.GeocoderResponse>((resolve, reject) => {
        this.geocoder!.geocode({ location: latLng }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results) {
            resolve({ results });
          } else {
            reject(new Error(`Reverse geocoding failed: ${status}`));
          }
        });
      });

      if (!response.results || response.results.length === 0) {
        return {
          success: false,
          error: 'No address found for the provided coordinates'
        };
      }

      const addresses = response.results.map(result => ({
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        types: result.types,
        addressComponents: this.parseAddressComponents(result.address_components)
      }));

      return {
        success: true,
        addresses,
        primaryAddress: addresses[0]
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reverse geocoding failed'
      };
    }
  }

  /**
   * ✅ PATRÓN: Address Validation Pattern
   * Validar y normalizar dirección
   */
  public async validateAddress(address: DeliveryAddress): Promise<AddressValidationResult> {
    try {
      // 1. Construir dirección completa
      const fullAddress = this.buildFullAddress(address);

      // 2. Geocodificar para validar
      const geocodingResult = await this.geocodeAddress(fullAddress);
      if (!geocodingResult.success) {
        return {
          success: false,
          error: geocodingResult.error,
          isValid: false
        };
      }

      const geocodedData = geocodingResult.data!;

      // 3. Analizar calidad de la coincidencia
      const validation = this.analyzeAddressMatch(address, geocodedData);

      // 4. Verificar área de entrega
      const deliveryCheck = await this.checkDeliveryArea(geocodedData.coordinates);

      return {
        success: true,
        isValid: validation.isValid,
        confidence: validation.confidence,
        normalizedAddress: this.createNormalizedAddress(geocodedData),
        suggestions: validation.suggestions,
        deliveryInfo: deliveryCheck,
        geocodingData: geocodedData
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Address validation failed',
        isValid: false
      };
    }
  }

  /**
   * 🛣️ PATRÓN: Route Calculation Pattern
   * Calcular ruta y tiempo de entrega
   */
  public async calculateRoute(request: RouteCalculationRequest): Promise<RouteCalculationResult> {
    try {
      if (!this.isInitialized || !this.directionsService) {
        return {
          success: false,
          error: 'Google Maps not initialized or directions service not available'
        };
      }

      const directionsRequest: google.maps.DirectionsRequest = {
        origin: typeof request.origin === 'string' ? request.origin : new google.maps.LatLng(request.origin.latitude, request.origin.longitude),
        destination: typeof request.destination === 'string' ? request.destination : new google.maps.LatLng(request.destination.latitude, request.destination.longitude),
        travelMode: this.mapTravelMode(request.travelMode || 'DRIVING'),
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: request.avoidHighways || false,
        avoidTolls: request.avoidTolls || false,
        optimizeWaypoints: true
      };

      // Agregar waypoints si existen
      if (request.waypoints && request.waypoints.length > 0) {
        directionsRequest.waypoints = request.waypoints.map(waypoint => ({
          location: typeof waypoint === 'string' ? waypoint : new google.maps.LatLng(waypoint.latitude, waypoint.longitude),
          stopover: true
        }));
      }

      const response = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        this.directionsService!.route(directionsRequest, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Route calculation failed: ${status}`));
          }
        });
      });

      if (!response.routes || response.routes.length === 0) {
        return {
          success: false,
          error: 'No route found between origin and destination'
        };
      }

      const route = response.routes[0];
      const leg = route.legs[0];

      const routeData: RouteData = {
        distance: {
          text: leg.distance?.text || 'Unknown',
          value: leg.distance?.value || 0
        },
        duration: {
          text: leg.duration?.text || 'Unknown',
          value: leg.duration?.value || 0
        },
        durationInTraffic: leg.duration_in_traffic ? {
          text: leg.duration_in_traffic.text,
          value: leg.duration_in_traffic.value
        } : undefined,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: leg.steps?.map(step => ({
          instruction: step.instructions,
          distance: {
            text: step.distance?.text || '',
            value: step.distance?.value || 0
          },
          duration: {
            text: step.duration?.text || '',
            value: step.duration?.value || 0
          }
        })) || [],
        polyline: route.overview_polyline || '',
        bounds: {
          northeast: {
            latitude: route.bounds?.getNorthEast().lat() || 0,
            longitude: route.bounds?.getNorthEast().lng() || 0
          },
          southwest: {
            latitude: route.bounds?.getSouthWest().lat() || 0,
            longitude: route.bounds?.getSouthWest().lng() || 0
          }
        }
      };

      // Calcular estimación de entrega
      const deliveryEstimate = this.calculateDeliveryEstimate(routeData, request.deliveryOptions);

      this.emitEvent('route.calculated', {
        origin: request.origin,
        destination: request.destination,
        distance: routeData.distance.value,
        duration: routeData.duration.value,
        timestamp: Date.now()
      });

      return {
        success: true,
        route: routeData,
        deliveryEstimate
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Route calculation failed'
      };
    }
  }

  /**
   * 🔍 PATRÓN: Places Search Pattern
   * Buscar lugares cercanos
   */
  public async searchNearbyPlaces(request: PlacesSearchRequest): Promise<PlacesSearchResult> {
    try {
      if (!this.isInitialized || !this.config.enablePlaces) {
        return {
          success: false,
          error: 'Google Maps not initialized or Places API not enabled'
        };
      }

      // Crear un mapa temporal para el servicio de Places
      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv, {
        center: { lat: request.location.latitude, lng: request.location.longitude },
        zoom: this.config.defaultZoom
      });

      this.placesService = new google.maps.places.PlacesService(map);

      const searchRequest: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(request.location.latitude, request.location.longitude),
        radius: request.radius || 5000,
        type: request.placeType
      };

      if (request.keyword) {
        searchRequest.keyword = request.keyword;
      }

      const response = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
        this.placesService!.nearbySearch(searchRequest, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        });
      });

      const places = response.map(place => ({
        placeId: place.place_id || '',
        name: place.name || 'Unknown',
        address: place.vicinity || place.formatted_address || 'Unknown',
        coordinates: place.geometry?.location ? {
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng()
        } : { latitude: 0, longitude: 0 },
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types || [],
        openNow: place.opening_hours?.open_now,
        photos: place.photos?.map(photo => ({
          url: photo.getUrl({ maxWidth: 400, maxHeight: 400 }),
          width: photo.width || 400,
          height: photo.height || 400
        })) || []
      }));

      return {
        success: true,
        places,
        searchLocation: request.location,
        searchRadius: request.radius || 5000
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Places search failed'
      };
    }
  }

  /**
   * 📍 PATRÓN: Geolocation Pattern
   * Obtener ubicación actual del usuario
   */
  public async getCurrentLocation(): Promise<GeolocationResult> {
    try {
      if (!navigator.geolocation) {
        return {
          success: false,
          error: 'Geolocation is not supported by this browser'
        };
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutos
          }
        );
      });

      const coordinates: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      // Obtener dirección de las coordenadas
      const addressResult = await this.reverseGeocode(coordinates);

      return {
        success: true,
        coordinates,
        accuracy: position.coords.accuracy,
        address: addressResult.success ? addressResult.primaryAddress?.formattedAddress : undefined,
        timestamp: position.timestamp
      };

    } catch (error) {
      return {
        success: false,
        error: this.handleGeolocationError(error)
      };
    }
  }

  /**
   * 🚚 PATRÓN: Delivery Area Check Pattern
   * Verificar si una dirección está en el área de entrega
   */
  public async checkDeliveryArea(coordinates: Coordinates): Promise<DeliveryAreaResult> {
    try {
      // En una implementación real, aquí se verificaría contra polígonos de área de entrega
      // Por ahora, simulamos una verificación básica por distancia

      const restaurantLocation: Coordinates = {
        latitude: 40.7128, // Nueva York (ejemplo)
        longitude: -74.0060
      };

      const distance = this.calculateDistance(restaurantLocation, coordinates);
      const maxDeliveryDistance = 25; // 25 km

      const isInDeliveryArea = distance <= maxDeliveryDistance;
      
      let deliveryFee = 0;
      let estimatedTime = 0;

      if (isInDeliveryArea) {
        // Calcular tarifa de entrega basada en distancia
        if (distance <= 5) {
          deliveryFee = 2.99;
          estimatedTime = 20;
        } else if (distance <= 15) {
          deliveryFee = 4.99;
          estimatedTime = 35;
        } else {
          deliveryFee = 7.99;
          estimatedTime = 50;
        }
      }

      return {
        success: true,
        isInDeliveryArea,
        distance,
        deliveryFee,
        estimatedDeliveryTime: estimatedTime,
        deliveryZone: this.getDeliveryZone(distance)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check delivery area'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Event Listener Pattern
   * Agregar event listener
   */
  public addEventListener(eventType: string, listener: (data: unknown) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 🗑️ PATRÓN: Event Listener Pattern
   * Remover event listener
   */
  public removeEventListener(eventType: string, listener: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 📚 PATRÓN: API Loading Pattern
   * Cargar Google Maps API dinámicamente
   */
  private async loadGoogleMapsAPI(): Promise<GoogleMapsInitResult> {
    try {
      // Verificar si ya está cargado
      if (window.google && window.google.maps) {
        this.googleMaps = window.google.maps;
        return { success: true };
      }

      // Cargar API dinámicamente
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.config.apiKey}&libraries=places,geometry&language=${this.config.language}&region=${this.config.region}`;
      script.async = true;
      script.defer = true;

      const loadPromise = new Promise<void>((resolve, reject) => {
        script.onload = () => {
          if (window.google && window.google.maps) {
            this.googleMaps = window.google.maps;
            resolve();
          } else {
            reject(new Error('Google Maps API failed to load properly'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load Google Maps API script'));
      });

      document.head.appendChild(script);
      await loadPromise;

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load Google Maps API'
      };
    }
  }

  /**
   * 🔧 PATRÓN: Service Initialization Pattern
   * Inicializar servicios de Google Maps
   */
  private initializeServices(): void {
    if (!this.googleMaps) return;

    if (this.config.enableGeocoding) {
      this.geocoder = new this.googleMaps.Geocoder();
    }

    if (this.config.enableDirections) {
      this.directionsService = new this.googleMaps.DirectionsService();
    }
  }

  /**
   * 📋 PATRÓN: Service Discovery Pattern
   * Obtener servicios disponibles
   */
  private getAvailableServices(): string[] {
    const services: string[] = [];
    
    if (this.geocoder) services.push('geocoding');
    if (this.directionsService) services.push('directions');
    if (this.config.enablePlaces) services.push('places');
    
    return services;
  }

  /**
   * 🏠 PATRÓN: Address Component Parsing Pattern
   * Parsear componentes de dirección
   */
  private parseAddressComponents(components: google.maps.GeocoderAddressComponent[]): AddressComponents {
    const parsed: AddressComponents = {};

    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        parsed.street = component.long_name;
      } else if (types.includes('locality')) {
        parsed.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.state = component.long_name;
        parsed.stateCode = component.short_name;
      } else if (types.includes('country')) {
        parsed.country = component.long_name;
        parsed.countryCode = component.short_name;
      } else if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      } else if (types.includes('sublocality') || types.includes('neighborhood')) {
        parsed.neighborhood = component.long_name;
      }
    });

    return parsed;
  }

  /**
   * 🏠 PATRÓN: Address Building Pattern
   * Construir dirección completa
   */
  private buildFullAddress(address: DeliveryAddress): string {
    const parts: string[] = [];
    
    if (address.getStreet()) parts.push(address.getStreet());
    if (address.getCity()) parts.push(address.getCity());
    if (address.getState()) parts.push(address.getState());
    if (address.getZipCode()) parts.push(address.getZipCode());
    if (address.getCountry()) parts.push(address.getCountry());
    
    return parts.join(', ');
  }

  /**
   * ✅ PATRÓN: Address Matching Analysis Pattern
   * Analizar coincidencia de dirección
   */
  private analyzeAddressMatch(original: DeliveryAddress, geocoded: GeocodingData): AddressMatchAnalysis {
    let confidence = 0;
    const suggestions: string[] = [];

    // Comparar componentes de dirección
    const originalCity = original.getCity().toLowerCase();
    const geocodedCity = geocoded.addressComponents.city?.toLowerCase() || '';
    
    if (originalCity === geocodedCity) {
      confidence += 30;
    } else if (geocodedCity.includes(originalCity) || originalCity.includes(geocodedCity)) {
      confidence += 15;
      suggestions.push(`City might be "${geocoded.addressComponents.city}" instead of "${original.getCity()}"`);
    }

    const originalState = original.getState().toLowerCase();
    const geocodedState = geocoded.addressComponents.state?.toLowerCase() || '';
    
    if (originalState === geocodedState) {
      confidence += 25;
    } else {
      suggestions.push(`State should be "${geocoded.addressComponents.state}" instead of "${original.getState()}"`);
    }

    const originalPostal = original.getZipCode();
    const geocodedPostal = geocoded.addressComponents.postalCode || '';
    
    if (originalPostal === geocodedPostal) {
      confidence += 25;
    } else {
      suggestions.push(`Postal code should be "${geocodedPostal}" instead of "${originalPostal}"`);
    }

    // Verificar precisión de ubicación
    if (geocoded.locationType === google.maps.GeocoderLocationType.ROOFTOP) {
      confidence += 20;
    } else if (geocoded.locationType === google.maps.GeocoderLocationType.RANGE_INTERPOLATED) {
      confidence += 15;
    } else {
      confidence += 5;
      suggestions.push('Address location is approximate');
    }

    return {
      isValid: confidence >= 70,
      confidence,
      suggestions
    };
  }

  /**
   * 🏠 PATRÓN: Address Normalization Pattern
   * Crear dirección normalizada
   */
  private createNormalizedAddress(geocoded: GeocodingData): NormalizedAddress {
    return {
      formattedAddress: geocoded.formattedAddress,
      streetAddress: `${geocoded.addressComponents.streetNumber || ''} ${geocoded.addressComponents.street || ''}`.trim(),
      city: geocoded.addressComponents.city || '',
      state: geocoded.addressComponents.state || '',
      stateCode: geocoded.addressComponents.stateCode || '',
      postalCode: geocoded.addressComponents.postalCode || '',
      country: geocoded.addressComponents.country || '',
      countryCode: geocoded.addressComponents.countryCode || '',
      coordinates: geocoded.coordinates,
      placeId: geocoded.placeId
    };
  }

  /**
   * 🚗 PATRÓN: Travel Mode Mapping Pattern
   * Mapear modo de viaje
   */
  private mapTravelMode(mode: string): google.maps.TravelMode {
    switch (mode.toUpperCase()) {
      case 'DRIVING':
        return google.maps.TravelMode.DRIVING;
      case 'WALKING':
        return google.maps.TravelMode.WALKING;
      case 'BICYCLING':
        return google.maps.TravelMode.BICYCLING;
      case 'TRANSIT':
        return google.maps.TravelMode.TRANSIT;
      default:
        return google.maps.TravelMode.DRIVING;
    }
  }

  /**
   * 🚚 PATRÓN: Delivery Estimation Pattern
   * Calcular estimación de entrega
   */
  private calculateDeliveryEstimate(route: RouteData, options?: DeliveryOptions): DeliveryEstimate {
    const baseDuration = route.duration.value; // en segundos
    const baseDistance = route.distance.value; // en metros

    // Factores de ajuste
    let preparationTime = options?.preparationTime || 15 * 60; // 15 minutos por defecto
    let trafficMultiplier = 1.2; // Factor de tráfico
    let deliveryBuffer = 5 * 60; // 5 minutos de buffer

    // Ajustar por hora del día
    const currentHour = new Date().getHours();
    if (currentHour >= 11 && currentHour <= 14) { // Hora de almuerzo
      trafficMultiplier = 1.5;
      preparationTime += 5 * 60;
    } else if (currentHour >= 17 && currentHour <= 20) { // Hora de cena
      trafficMultiplier = 1.4;
      preparationTime += 3 * 60;
    }

    // Ajustar por distancia
    if (baseDistance > 10000) { // Más de 10km
      deliveryBuffer += 5 * 60;
    }

    const adjustedTravelTime = Math.round(baseDuration * trafficMultiplier);
    const totalTime = preparationTime + adjustedTravelTime + deliveryBuffer;

    const estimatedArrival = new Date(Date.now() + totalTime * 1000);

    return {
      preparationTime,
      travelTime: adjustedTravelTime,
      totalTime,
      estimatedArrival,
      confidence: this.calculateEstimateConfidence(route)
    };
  }

  /**
   * 📊 PATRÓN: Confidence Calculation Pattern
   * Calcular confianza de estimación
   */
  private calculateEstimateConfidence(route: RouteData): number {
    let confidence = 80; // Base confidence

    // Ajustar por distancia
    if (route.distance.value > 20000) { // Más de 20km
      confidence -= 20;
    } else if (route.distance.value < 5000) { // Menos de 5km
      confidence += 10;
    }

    // Ajustar por tráfico en tiempo real
    if (route.durationInTraffic) {
      const trafficRatio = route.durationInTraffic.value / route.duration.value;
      if (trafficRatio > 1.5) {
        confidence -= 15;
      } else if (trafficRatio < 1.2) {
        confidence += 5;
      }
    }

    // Ajustar por hora del día
    const currentHour = new Date().getHours();
    if (currentHour >= 11 && currentHour <= 14 || currentHour >= 17 && currentHour <= 20) {
      confidence -= 10;
    }

    return Math.max(50, Math.min(95, confidence));
  }

  /**
   * 📏 PATRÓN: Distance Calculation Pattern
   * Calcular distancia entre coordenadas
   */
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 🌍 PATRÓN: Zone Classification Pattern
   * Obtener zona de entrega
   */
  private getDeliveryZone(distance: number): string {
    if (distance <= 5) return 'Zone 1 - Local';
    if (distance <= 15) return 'Zone 2 - Extended';
    if (distance <= 25) return 'Zone 3 - Remote';
    return 'Outside delivery area';
  }

  /**
   * 🔄 PATRÓN: Utility Methods
   * Métodos utilitarios
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private handleGeolocationError(error: unknown): string {
    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          return 'Location access denied by user';
        case error.POSITION_UNAVAILABLE:
          return 'Location information unavailable';
        case error.TIMEOUT:
          return 'Location request timed out';
        default:
          return 'Unknown geolocation error';
      }
    }
    return error instanceof Error ? error.message : 'Geolocation failed';
  }

  /**
   * 📡 PATRÓN: Event Emission Pattern
   * Emitir evento a listeners
   */
  private emitEvent(eventType: string, data: unknown): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para Google Maps integration
 */
export interface GoogleMapsConfig {
  apiKey: string;
  region?: string;
  language?: string;
  enablePlaces?: boolean;
  enableDirections?: boolean;
  enableGeocoding?: boolean;
  defaultZoom?: number;
  restrictCountries?: string[];
}

export interface GoogleMapsInitResult {
  success: boolean;
  message?: string;
  services?: string[];
  error?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  success: boolean;
  data?: GeocodingData;
  error?: string;
}

export interface GeocodingData {
  formattedAddress: string;
  coordinates: Coordinates;
  placeId: string;
  addressComponents: AddressComponents;
  locationType: google.maps.GeocoderLocationType;
  viewport: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
}

export interface AddressComponents {
  streetNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  neighborhood?: string;
}

export interface ReverseGeocodingResult {
  success: boolean;
  addresses?: Array<{
    formattedAddress: string;
    placeId: string;
    types: string[];
    addressComponents: AddressComponents;
  }>;
  primaryAddress?: {
    formattedAddress: string;
    placeId: string;
    types: string[];
    addressComponents: AddressComponents;
  };
  error?: string;
}

export interface AddressValidationResult {
  success: boolean;
  isValid?: boolean;
  confidence?: number;
  normalizedAddress?: NormalizedAddress;
  suggestions?: string[];
  deliveryInfo?: DeliveryAreaResult;
  geocodingData?: GeocodingData;
  error?: string;
}

export interface NormalizedAddress {
  formattedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: string;
  countryCode: string;
  coordinates: Coordinates;
  placeId: string;
}

export interface AddressMatchAnalysis {
  isValid: boolean;
  confidence: number;
  suggestions: string[];
}

export interface RouteCalculationRequest {
  origin: string | Coordinates;
  destination: string | Coordinates;
  travelMode?: string;
  waypoints?: (string | Coordinates)[];
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  deliveryOptions?: DeliveryOptions;
}

export interface RouteCalculationResult {
  success: boolean;
  route?: RouteData;
  deliveryEstimate?: DeliveryEstimate;
  error?: string;
}

export interface RouteData {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  durationInTraffic?: {
    text: string;
    value: number;
  };
  startAddress: string;
  endAddress: string;
  steps: Array<{
    instruction: string;
    distance: {
      text: string;
      value: number;
    };
    duration: {
      text: string;
      value: number;
    };
  }>;
  polyline: string;
  bounds: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
}

export interface DeliveryOptions {
  preparationTime?: number;
  rushDelivery?: boolean;
  scheduledTime?: Date;
}

export interface DeliveryEstimate {
  preparationTime: number;
  travelTime: number;
  totalTime: number;
  estimatedArrival: Date;
  confidence: number;
}

export interface PlacesSearchRequest {
  location: Coordinates;
  radius?: number;
  placeType?: string;
  keyword?: string;
}

export interface PlacesSearchResult {
  success: boolean;
  places?: Array<{
    placeId: string;
    name: string;
    address: string;
    coordinates: Coordinates;
    rating?: number;
    priceLevel?: number;
    types: string[];
    openNow?: boolean;
    photos: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  }>;
  searchLocation?: Coordinates;
  searchRadius?: number;
  error?: string;
}

export interface GeolocationResult {
  success: boolean;
  coordinates?: Coordinates;
  accuracy?: number;
  address?: string;
  timestamp?: number;
  error?: string;
}

export interface DeliveryAreaResult {
  success: boolean;
  isInDeliveryArea?: boolean;
  distance?: number;
  deliveryFee?: number;
  estimatedDeliveryTime?: number;
  deliveryZone?: string;
  error?: string;
}

// Extensión de tipos globales para Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}
