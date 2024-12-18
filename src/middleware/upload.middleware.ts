import { Request, Response, NextFunction } from 'express';
import { UploadUtil } from '../utils/upload.util';

export const uploadFile = (fieldName: string) => {
  return UploadUtil.upload.single(fieldName);
};

export const uploadFiles = (fieldName: string, maxCount: number = 5) => {
  return UploadUtil.upload.array(fieldName, maxCount);
};