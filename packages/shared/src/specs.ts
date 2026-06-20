// Single source of truth for phone specifications.
// Used by backend scoring + spec-distribution endpoints AND frontend charts.

export type SpecType = 'quantitative' | 'categorical' | 'boolean';

export type SpecCategory =
  | 'Rendimiento'
  | 'Almacenamiento'
  | 'Bateria'
  | 'Pantalla'
  | 'Camara'
  | 'Conectividad'
  | 'Economía';

export interface SpecDef {
  /** Field key as stored in the dataset_phones / products spec object (camelCase). */
  key: string;
  label: string;
  /** Plain-language explanation of what this spec means (shown in the chart modal). */
  description: string;
  type: SpecType;
  unit?: string;
  /** Decimals to show for quantitative values (default 2). */
  decimals?: number;
  category: SpecCategory;
  /** Relative weight within the scoring algorithm. */
  weight: number;
  /** For quantitative specs: is a higher value better? (price is the exception) */
  higherIsBetter?: boolean;
  /** Chart type used when the spec card is expanded. */
  chart: 'bar' | 'histogram' | 'pie';
}

export const SPEC_DEFS: SpecDef[] = [
  // ---- Rendimiento ----
  { key: 'processorCore', label: 'Nucleos del procesador', description: 'Cantidad de núcleos de la CPU. Más núcleos permiten ejecutar más tareas en paralelo y mejoran el rendimiento en multitarea y juegos.', type: 'quantitative', unit: 'cores', category: 'Rendimiento', weight: 1, higherIsBetter: true, chart: 'bar' },
  { key: 'processorSpeedGhz', label: 'Velocidad del procesador', description: 'Frecuencia de reloj de la CPU medida en GHz. Una mayor velocidad suele traducirse en un procesamiento más rápido.', type: 'quantitative', unit: 'GHz', category: 'Rendimiento', weight: 1.2, higherIsBetter: true, chart: 'histogram' },
  { key: 'ram', label: 'Memoria RAM', description: 'Memoria de acceso aleatorio donde se cargan las apps en uso. Más RAM permite tener más aplicaciones abiertas a la vez y mejora la fluidez.', type: 'quantitative', unit: 'GB', category: 'Rendimiento', weight: 1.5, higherIsBetter: true, chart: 'bar' },
  { key: 'processorBrand', label: 'Marca del procesador', description: 'Fabricante del chip (Snapdragon, Dimensity, Exynos, etc.). Influye en el rendimiento, la eficiencia energética y la compatibilidad.', type: 'categorical', category: 'Rendimiento', weight: 0.5, chart: 'pie' },
  { key: 'processorModel', label: 'Modelo del procesador', description: 'Modelo específico del chip dentro de su marca (por ejemplo, Snapdragon 8 Gen 3). Define con más precisión el nivel de rendimiento que la sola marca.', type: 'categorical', category: 'Rendimiento', weight: 0, chart: 'bar' },
  { key: 'os', label: 'Sistema operativo', description: 'Software base del teléfono (Android o iOS). Determina la interfaz, las apps disponibles, la integración con otros dispositivos y las actualizaciones.', type: 'categorical', category: 'Rendimiento', weight: 0, chart: 'pie' },

  // ---- Almacenamiento ----
  { key: 'storage', label: 'Almacenamiento', description: 'Espacio interno para apps, fotos, videos y archivos. Más almacenamiento permite guardar más contenido sin depender de la nube.', type: 'quantitative', unit: 'GB', category: 'Almacenamiento', weight: 1.5, higherIsBetter: true, chart: 'bar' },
  { key: 'isMemoryCardSupported', label: 'Soporta tarjeta de memoria', description: 'Indica si el teléfono admite tarjetas microSD para ampliar el almacenamiento interno.', type: 'boolean', category: 'Almacenamiento', weight: 0.4, chart: 'pie' },

  // ---- Bateria ----
  { key: 'batteryCapacity', label: 'Capacidad de bateria', description: 'Energía que puede almacenar la batería, medida en mAh. Una mayor capacidad suele indicar más horas de autonomía.', type: 'quantitative', unit: 'mAh', category: 'Bateria', weight: 1.5, higherIsBetter: true, chart: 'histogram' },
  { key: 'isFastCharging', label: 'Carga rapida', description: 'Indica si el equipo soporta tecnología de carga rápida para reducir el tiempo necesario para cargar la batería.', type: 'boolean', category: 'Bateria', weight: 0.4, chart: 'pie' },
  { key: 'fastChargingCapacity', label: 'Potencia de carga rapida', description: 'Potencia máxima de carga en watts (W). A mayor potencia, menor es el tiempo de carga de la batería.', type: 'quantitative', unit: 'W', category: 'Bateria', weight: 1, higherIsBetter: true, chart: 'histogram' },

  // ---- Pantalla ----
  { key: 'displaySize', label: 'Tamaño de pantalla', description: 'Diagonal de la pantalla en pulgadas. Las pantallas más grandes son mejores para multimedia y juegos, pero hacen el equipo menos compacto.', type: 'quantitative', unit: '"', category: 'Pantalla', weight: 0.8, higherIsBetter: true, chart: 'histogram' },
  { key: 'displayRefreshRate', label: 'Tasa de refresco', description: 'Cantidad de veces por segundo que la pantalla se actualiza, medida en Hz. Más Hz se traduce en desplazamiento y animaciones más fluidos.', type: 'quantitative', unit: 'Hz', category: 'Pantalla', weight: 1.2, higherIsBetter: true, chart: 'histogram' },
  { key: 'displayPpi', label: 'Densidad de pixeles', description: 'Píxeles por pulgada (ppi). Una mayor densidad implica una imagen más nítida y definida.', type: 'quantitative', unit: 'ppi', decimals: 0, category: 'Pantalla', weight: 1, higherIsBetter: true, chart: 'histogram' },
  { key: 'pixelWidth', label: 'Ancho en píxeles', description: 'Cantidad de píxeles a lo ancho de la pantalla. Junto con el alto define la resolución total de la imagen.', type: 'quantitative', unit: 'px', decimals: 0, category: 'Pantalla', weight: 0, higherIsBetter: true, chart: 'histogram' },
  { key: 'pixelHeight', label: 'Alto en píxeles', description: 'Cantidad de píxeles a lo alto de la pantalla. Junto con el ancho define la resolución total de la imagen.', type: 'quantitative', unit: 'px', decimals: 0, category: 'Pantalla', weight: 0, higherIsBetter: true, chart: 'histogram' },
  { key: 'cameraNotchType', label: 'Tipo de notch', description: 'Forma del recorte que aloja la cámara frontal y afecta cuánto se aprovecha la pantalla. Punch Hole (perforación): un pequeño orificio circular dentro de la pantalla, discreto y muy usado hoy. Dynamic Island (isla dinámica): un recorte con forma de píldora que el software integra para mostrar notificaciones, llamadas y actividades en vivo. Notch (muesca): una pestaña rectangular en la parte superior. Waterdrop (gota de agua): una muesca pequeña con forma de gota.', type: 'categorical', category: 'Pantalla', weight: 0.3, chart: 'pie' },

  // ---- Camara ----
  { key: 'primaryRearMp', label: 'Camara trasera principal', description: 'Resolución del sensor trasero principal en megapíxeles (MP). Suele indicar mayor nivel de detalle, aunque la calidad depende de varios factores.', type: 'quantitative', unit: 'MP', category: 'Camara', weight: 1.3, higherIsBetter: true, chart: 'histogram' },
  { key: 'primaryFrontMp', label: 'Camara frontal', description: 'Resolución de la cámara frontal (selfies) en megapíxeles (MP).', type: 'quantitative', unit: 'MP', category: 'Camara', weight: 0.8, higherIsBetter: true, chart: 'histogram' },
  { key: 'numRearCameras', label: 'Numero de camaras traseras', description: 'Cantidad de sensores en la parte trasera (principal, ultra gran angular, macro, teleobjetivo, etc.). Más cámaras ofrecen más versatilidad.', type: 'quantitative', unit: '', category: 'Camara', weight: 0.6, higherIsBetter: true, chart: 'bar' },
  { key: 'numFrontCameras', label: 'Numero de camaras frontales', description: 'Cantidad de cámaras en el frente del equipo.', type: 'quantitative', unit: '', category: 'Camara', weight: 0.3, higherIsBetter: true, chart: 'bar' },

  // ---- Conectividad ----
  { key: 'has5g', label: '5G', description: 'Conectividad móvil de quinta generación: mayor velocidad de datos y menor latencia que la red 4G.', type: 'boolean', category: 'Conectividad', weight: 1, chart: 'pie' },
  { key: 'nfc', label: 'NFC', description: 'Comunicación de campo cercano. Permite pagos sin contacto y el emparejamiento rápido con otros dispositivos.', type: 'boolean', category: 'Conectividad', weight: 0.6, chart: 'pie' },
  { key: 'volte', label: 'VoLTE', description: 'Voz sobre LTE: realiza llamadas a través de la red 4G, con mejor calidad de audio y conexión más rápida.', type: 'boolean', category: 'Conectividad', weight: 0.4, chart: 'pie' },
  { key: 'wifi', label: 'Wi-Fi', description: 'Capacidad de conectarse a redes inalámbricas Wi-Fi para acceder a internet.', type: 'boolean', category: 'Conectividad', weight: 0.3, chart: 'pie' },
  { key: 'dualSim', label: 'Dual SIM', description: 'Permite utilizar dos tarjetas SIM en un mismo teléfono, por ejemplo una personal y una laboral.', type: 'boolean', category: 'Conectividad', weight: 0.4, chart: 'pie' },
  { key: 'irBlaster', label: 'IR Blaster', description: 'Emisor de infrarrojos que permite usar el teléfono como control remoto de televisores, aires acondicionados y otros aparatos.', type: 'boolean', category: 'Conectividad', weight: 0.2, chart: 'pie' },

  // ---- Economía ----
  // (El puntaje de "Economía" se calcula a partir de la eficiencia de precio en scoring.service.ts.)
];

/** Specs that are categorical and tracked for distribution charts even outside scoring. */
export const CATEGORICAL_SPECS = ['brand', 'os', 'processorBrand', 'cameraNotchType'];

/** Numeric spec keys for which spec_stats distributions are precomputed. */
export const NUMERIC_SPEC_KEYS = SPEC_DEFS.filter((s) => s.type === 'quantitative').map((s) => s.key);

export const BOOLEAN_SPEC_KEYS = SPEC_DEFS.filter((s) => s.type === 'boolean').map((s) => s.key);

export const SPEC_CATEGORIES: SpecCategory[] = [
  'Rendimiento',
  'Almacenamiento',
  'Bateria',
  'Pantalla',
  'Camara',
  'Conectividad',
  'Economía',
];

/** Weight of each category in the GLOBAL score (sums to 1). */
export const CATEGORY_WEIGHTS: Record<SpecCategory, number> = {
  Rendimiento: 0.2,
  Camara: 0.18,
  Pantalla: 0.15,
  Bateria: 0.15,
  Almacenamiento: 0.1,
  Conectividad: 0.1,
  'Economía': 0.12,
};

export function getSpecDef(key: string): SpecDef | undefined {
  return SPEC_DEFS.find((s) => s.key === key);
}
