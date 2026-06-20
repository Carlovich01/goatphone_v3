import { PhoneSpecs, Product } from '@goatphone/shared';

/** Maps a DatasetPhone prisma row to the shared PhoneSpecs shape. */
export function toPhoneSpecs(d: any): PhoneSpecs {
  return {
    pos: d.pos ?? null,
    brand: d.brand,
    model: d.model,
    price: d.price ?? null,
    rating: d.rating ?? null,
    dualSim: !!d.dualSim,
    has3g: !!d.has3g,
    has4g: !!d.has4g,
    has5g: !!d.has5g,
    volte: !!d.volte,
    vo5g: !!d.vo5g,
    wifi: !!d.wifi,
    nfc: !!d.nfc,
    irBlaster: !!d.irBlaster,
    processorCore: d.processorCore ?? null,
    processorSpeedGhz: d.processorSpeedGhz ?? null,
    ram: d.ram ?? null,
    storage: d.storage ?? null,
    batteryCapacity: d.batteryCapacity ?? null,
    isFastCharging: !!d.isFastCharging,
    fastChargingCapacity: d.fastChargingCapacity ?? null,
    displaySize: d.displaySize ?? null,
    displayRefreshRate: d.displayRefreshRate ?? null,
    cameraNotchType: d.cameraNotchType ?? null,
    pixelWidth: d.pixelWidth ?? null,
    pixelHeight: d.pixelHeight ?? null,
    displayPpi: d.displayPpi ?? null,
    os: d.os ?? null,
    isMemoryCardSupported: !!d.isMemoryCardSupported,
    maxCardGb: d.maxCardGb ?? null,
    primaryRearMp: d.primaryRearMp ?? null,
    primaryFrontMp: d.primaryFrontMp ?? null,
    numRearCameras: d.numRearCameras ?? null,
    numFrontCameras: d.numFrontCameras ?? null,
    processorBrand: d.processorBrand ?? null,
    processorModel: d.processorModel ?? null,
  };
}

/** Maps a Prisma product (with datasetPhone included) to the shared Product DTO. */
export function mapProduct(p: any): Product {
  return {
    id: p.id,
    datasetPhoneId: p.datasetPhoneId,
    brand: p.brand,
    model: p.model,
    priceArs: p.priceArs,
    offerPriceArs: p.offerPriceArs ?? null,
    offerEndsAt: p.offerEndsAt
      ? p.offerEndsAt instanceof Date
        ? p.offerEndsAt.toISOString()
        : p.offerEndsAt
      : null,
    stock: p.stock,
    imageUrl: p.imageUrl ?? null,
    description: p.description ?? null,
    isActive: p.isActive,
    specs: toPhoneSpecs(p.datasetPhone),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

/** Builds a compact text document of a product for embeddings / RAG context. */
export function buildPhoneDoc(brand: string, model: string, priceArs: number, stock: number, s: PhoneSpecs): string {
  const parts = [
    `${brand} ${model}.`,
    `Precio ARS ${priceArs}. Stock ${stock}.`,
    s.ram ? `RAM ${s.ram}GB.` : '',
    s.storage ? `Almacenamiento ${s.storage}GB.` : '',
    s.batteryCapacity ? `Bateria ${s.batteryCapacity}mAh.` : '',
    s.fastChargingCapacity ? `Carga rapida ${s.fastChargingCapacity}W.` : '',
    s.displaySize ? `Pantalla ${s.displaySize}" ${s.displayRefreshRate ?? ''}Hz ${s.displayPpi ? Math.round(s.displayPpi) + 'ppi' : ''}.` : '',
    s.primaryRearMp ? `Camara trasera ${s.primaryRearMp}MP, frontal ${s.primaryFrontMp ?? '?'}MP.` : '',
    s.processorBrand ? `Procesador ${s.processorBrand} ${s.processorModel ?? ''} ${s.processorCore ?? ''} nucleos ${s.processorSpeedGhz ?? ''}GHz.` : '',
    s.os ? `Sistema ${s.os}.` : '',
    s.has5g ? '5G.' : '4G.',
    s.nfc ? 'NFC.' : '',
  ];
  return parts.filter(Boolean).join(' ');
}
