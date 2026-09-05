import { getDistricts, getProvinces, getSubDistricts } from "thai-address-select";
import { z } from "zod";

export type ProfileActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const optionalText = (max: number, message: string) => z.preprocess(
  (value) => typeof value !== "string" || value.trim() === "" ? null : value,
  z.string().trim().max(max, message).nullable(),
);

const optionalCoordinate = (min: number, max: number) => z.preprocess(
  (value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    return Number(value);
  },
  z.number().finite().min(min).max(max).optional(),
);

const requiredHandle = z.preprocess(
  (value) => {
    return typeof value === "string" ? value.trim().replace(/^@+/u, "").toLowerCase() : "";
  },
  z.string()
    .min(3, "TAGNAME ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(40, "TAGNAME ยาวเกินไป")
    .regex(/^[a-z0-9_]+$/u, "ใช้ภาษาอังกฤษ ตัวเลข และ _ เท่านั้น"),
);

export const profileSchema = z
  .object({
    displayName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(80, "ชื่อยาวเกินไป"),
    handle: requiredHandle,
    bio: optionalText(280, "Bio ยาวเกินไป"),
    addressLine: z.string().trim().min(1, "กรุณากรอกที่อยู่").max(240, "ที่อยู่ยาวเกินไป"),
    province: z.string().trim().min(1, "กรุณาเลือกจังหวัด").max(80, "ชื่อจังหวัดยาวเกินไป"),
    district: z.string().trim().min(1, "กรุณาเลือกอำเภอ/เขต").max(80, "ชื่ออำเภอ/เขตยาวเกินไป"),
    subdistrict: z.string().trim().min(1, "กรุณาเลือกตำบล/แขวง").max(80, "ชื่อตำบล/แขวงยาวเกินไป"),
    postalCode: z.string().trim().regex(/^\d{5}$/, "กรุณากรอกรหัสไปรษณีย์ 5 หลัก"),
    latitude: optionalCoordinate(-90, 90),
    longitude: optionalCoordinate(-180, 180),
  })
  .superRefine((data, context) => {
    if ((data.latitude === undefined) !== (data.longitude === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "ต้องระบุพิกัด latitude และ longitude พร้อมกัน",
      });
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;

export function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function areaFieldErrors(data: ProfileInput) {
  const errors: Record<string, string[]> = {};
  const provinces = getProvinces();

  if (!provinces.includes(data.province)) {
    errors.province = ["ไม่พบจังหวัดนี้ในข้อมูลประเทศไทย"];
    return errors;
  }

  const districts = getDistricts(data.province);
  if (!districts.includes(data.district)) {
    errors.district = ["อำเภอ/เขตไม่ตรงกับจังหวัดที่เลือก"];
    return errors;
  }

  const subdistricts = getSubDistricts(data.province, data.district);
  if (!subdistricts.includes(data.subdistrict)) {
    errors.subdistrict = ["ตำบล/แขวงไม่ตรงกับอำเภอ/เขตที่เลือก"];
  }

  return errors;
}

export function parseProfileForm(formData: FormData):
  | { success: true; data: ProfileInput }
  | { success: false; state: ProfileActionState } {
  const parsed = profileSchema.safeParse({
    displayName: readFormText(formData, "displayName"),
    handle: readFormText(formData, "handle"),
    bio: readFormText(formData, "bio"),
    addressLine: readFormText(formData, "addressLine"),
    province: readFormText(formData, "province"),
    district: readFormText(formData, "district"),
    subdistrict: readFormText(formData, "subdistrict"),
    postalCode: readFormText(formData, "postalCode"),
    latitude: readFormText(formData, "latitude"),
    longitude: readFormText(formData, "longitude"),
  });

  if (!parsed.success) {
    return {
      success: false,
      state: {
        error: "กรุณาตรวจสอบข้อมูลให้ครบถ้วน",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const locationErrors = areaFieldErrors(parsed.data);
  if (Object.keys(locationErrors).length > 0) {
    return {
      success: false,
      state: {
        error: "กรุณาตรวจสอบข้อมูลพื้นที่ให้ถูกต้อง",
        fieldErrors: locationErrors,
      },
    };
  }

  return { success: true, data: parsed.data };
}
