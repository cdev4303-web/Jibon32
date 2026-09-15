import { Measurement } from '../types';

export const AI_DISCLAIMER_BN =
  '⚠️ বিঃদ্রঃ AI অটো মাপসমূহ স্ট্যান্ডার্ড সাইজ প্যাটার্নের উপর ভিত্তি করে অনুমান করা হয়েছে। কাপড় কাটার পূর্বে অবশ্যই ফিতা দিয়ে কাস্টমারের প্রকৃত মাপ যাচাই করে নিন।';

export const AI_DISCLAIMER_EN =
  '⚠️ Note: AI auto measurements are estimated based on standard sizing patterns. Please verify with physical tape measurements before cutting cloth.';

export const AI_DISCLAIMER = AI_DISCLAIMER_BN;

export interface EstimateOptions {
  dressType: string;
  sizeCategory: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  customerName?: string;
  customerPhone?: string;
}

export const calculateAiMeasurements = (options: EstimateOptions): Measurement => {
  const { dressType, sizeCategory, customerName = '', customerPhone = '' } = options;
  const dType = dressType.toLowerCase();

  let length = 56.0;
  let chest = 38.0;
  let waist = 34.0;
  let hip = 42.0;
  let shoulder = 15.0;
  let sleeve = 22.5;
  let neck = 7.0;
  let flare = 48.0;

  if (dType.includes('abaya') || dType.includes('বোরকা')) {
    switch (sizeCategory) {
      case 'S':
        length = 54.0; chest = 36.0; waist = 32.0; hip = 40.0; shoulder = 14.5; sleeve = 22.0; neck = 6.5; flare = 44.0;
        break;
      case 'L':
        length = 58.0; chest = 42.0; waist = 38.0; hip = 46.0; shoulder = 16.0; sleeve = 23.5; neck = 7.5; flare = 52.0;
        break;
      case 'XL':
      case 'XXL':
        length = 60.0; chest = 46.0; waist = 42.0; hip = 50.0; shoulder = 17.0; sleeve = 24.0; neck = 8.0; flare = 56.0;
        break;
      case 'M':
      default:
        length = 56.0; chest = 38.0; waist = 34.0; hip = 42.0; shoulder = 15.0; sleeve = 22.5; neck = 7.0; flare = 48.0;
        break;
    }
  } else if (dType.includes('gown') || dType.includes('গাউন')) {
    switch (sizeCategory) {
      case 'S':
        length = 55.0; chest = 34.0; waist = 28.0; hip = 38.0; shoulder = 14.0; sleeve = 22.0; neck = 6.5; flare = 58.0;
        break;
      case 'L':
        length = 58.0; chest = 40.0; waist = 34.0; hip = 44.0; shoulder = 15.5; sleeve = 23.5; neck = 7.0; flare = 68.0;
        break;
      case 'XL':
      case 'XXL':
        length = 60.0; chest = 44.0; waist = 38.0; hip = 48.0; shoulder = 16.5; sleeve = 24.0; neck = 7.5; flare = 72.0;
        break;
      case 'M':
      default:
        length = 56.0; chest = 36.0; waist = 30.0; hip = 40.0; shoulder = 14.5; sleeve = 22.5; neck = 6.5; flare = 62.0;
        break;
    }
  } else if (dType.includes('salwar') || dType.includes('কামিজ') || dType.includes('kurti')) {
    switch (sizeCategory) {
      case 'S':
        length = 40.0; chest = 34.0; waist = 30.0; hip = 38.0; shoulder = 14.0; sleeve = 18.0; neck = 6.0; flare = 22.0;
        break;
      case 'L':
        length = 44.0; chest = 40.0; waist = 36.0; hip = 44.0; shoulder = 15.5; sleeve = 19.5; neck = 7.0; flare = 26.0;
        break;
      case 'XL':
      case 'XXL':
        length = 46.0; chest = 44.0; waist = 40.0; hip = 48.0; shoulder = 16.5; sleeve = 20.0; neck = 7.5; flare = 28.0;
        break;
      case 'M':
      default:
        length = 42.0; chest = 36.0; waist = 32.0; hip = 40.0; shoulder = 14.5; sleeve = 19.0; neck = 6.5; flare = 24.0;
        break;
    }
  } else if (dType.includes('punjabi') || dType.includes('পাঞ্জাবি') || dType.includes('dishdasha')) {
    switch (sizeCategory) {
      case 'S':
        length = 52.0; chest = 38.0; waist = 36.0; hip = 40.0; shoulder = 16.5; sleeve = 23.5; neck = 15.0; flare = 28.0;
        break;
      case 'L':
        length = 56.0; chest = 44.0; waist = 42.0; hip = 46.0; shoulder = 18.0; sleeve = 25.0; neck = 16.5; flare = 32.0;
        break;
      case 'XL':
      case 'XXL':
        length = 58.0; chest = 48.0; waist = 46.0; hip = 50.0; shoulder = 19.0; sleeve = 25.5; neck = 17.5; flare = 34.0;
        break;
      case 'M':
      default:
        length = 54.0; chest = 41.0; waist = 39.0; hip = 43.0; shoulder = 17.0; sleeve = 24.0; neck = 15.5; flare = 30.0;
        break;
    }
  } else if (dType.includes('shirt') || dType.includes('শার্ট')) {
    switch (sizeCategory) {
      case 'S':
        length = 28.0; chest = 38.0; waist = 34.0; hip = 38.0; shoulder = 16.5; sleeve = 23.5; neck = 15.0; flare = 20.0;
        break;
      case 'L':
        length = 30.5; chest = 43.0; waist = 40.0; hip = 44.0; shoulder = 18.0; sleeve = 25.0; neck = 16.5; flare = 22.5;
        break;
      case 'XL':
      case 'XXL':
        length = 32.0; chest = 46.0; waist = 44.0; hip = 48.0; shoulder = 19.0; sleeve = 26.0; neck = 17.5; flare = 24.0;
        break;
      case 'M':
      default:
        length = 29.0; chest = 40.0; waist = 37.0; hip = 41.0; shoulder = 17.0; sleeve = 24.0; neck = 15.5; flare = 21.0;
        break;
    }
  } else if (dType.includes('pant') || dType.includes('প্যান্ট') || dType.includes('trouser')) {
    switch (sizeCategory) {
      case 'S':
        length = 38.0; chest = 0; waist = 30.0; hip = 37.0; shoulder = 0; sleeve = 0; neck = 0; flare = 14.0;
        break;
      case 'L':
        length = 41.0; chest = 0; waist = 36.0; hip = 43.0; shoulder = 0; sleeve = 0; neck = 0; flare = 16.0;
        break;
      case 'XL':
      case 'XXL':
        length = 42.0; chest = 0; waist = 40.0; hip = 47.0; shoulder = 0; sleeve = 0; neck = 0; flare = 17.0;
        break;
      case 'M':
      default:
        length = 39.5; chest = 0; waist = 33.0; hip = 40.0; shoulder = 0; sleeve = 0; neck = 0; flare = 15.0;
        break;
    }
  }

  return {
    id: `m-ai-${Date.now()}`,
    customerName,
    customerPhone,
    dressType,
    length,
    bodyChest: chest,
    waist,
    hip,
    shoulder,
    sleeve,
    neck,
    flareBottom: flare,
    unit: 'inches',
    designNotes: `AI Estimated (${sizeCategory} standard fit).`,
    specialInstructions: 'Verify with measuring tape prior to final cloth cutting.',
    updatedAt: Date.now(),
  };
};
