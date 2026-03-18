import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files for the specific photo capture modules.
const resources = {
  en: {
    translation: {
      "Start Assessment": "Start Assessment",
      "Next": "Next",
      "Got It — Continue": "Got It — Continue",
      "Upload Image": "Upload Image",
      "Capture": "Capture",
      "Retake": "Retake",
      "Retake All Photos": "Retake All Photos",
      "Submit Assessment": "Submit Assessment",
      "Done": "Done",
      "Review Your Photos": "Review Your Photos",
      "Make sure all vehicle sides are clearly visible": "Make sure all vehicle sides are clearly visible",

      // Preclaim / Motor
      "Pre Claim Policy Inspection": "Pre Claim Policy\nInspection",
      "Motor Claim Inspection": "Motor Claim\nInspection",
      "Take photos of your vehicle from all four sides for inspection": "Take photos of your vehicle from all four sides for inspection",
      "6 photos required: plate, chassis & 4 sides": "6 photos required: plate, chassis & 4 sides",
      "GPS location will be recorded": "GPS location will be recorded",
      "Securely submitted for assessment": "Securely submitted for assessment",
      
      "Photo Tips – Do's": "Photo Tips – Do's",
      "Photo Tips – Don'ts": "Photo Tips – Don'ts",
      "Follow these guidelines for the best results.": "Follow these guidelines for the best results.",
      "Ensure good lighting conditions": "Ensure good lighting conditions",
      "Keep the vehicle within the frame guide": "Keep the vehicle within the frame guide",
      "Take photos from a reasonable distance": "Take photos from a reasonable distance",
      "Ensure the entire vehicle is visible": "Ensure the entire vehicle is visible",
      "Don't shoot in direct harsh sunlight": "Don't shoot in direct harsh sunlight",
      "Don't cut off parts of the vehicle": "Don't cut off parts of the vehicle",
      "Don't use blurry or shaky photos": "Don't use blurry or shaky photos",

      "Turn Off Auto-Rotation": "Turn Off Auto-Rotation",
      "Before we begin, please turn off your phone's auto-rotation feature.": "Before we begin, please turn off your phone's auto-rotation feature.",
      "This ensures the camera stays in the correct orientation while you take photos.": "This ensures the camera stays in the correct orientation while you take photos.",

      "Allow Access": "Allow Access",
      "We need camera and GPS permissions to capture and geo-tag your vehicle photos.": "We need camera and GPS permissions to capture and geo-tag your vehicle photos.",
      "Grant Permissions": "Grant Permissions",
      "Camera permission denied. Please allow camera access in your browser settings.": "Camera permission denied. Please allow camera access in your browser settings.",
      "Requesting permissions…": "Requesting permissions…",
      "Camera": "Camera",
      "Location": "Location",

      "License Plate": "License Plate",
      "Chassis Number": "Chassis Number",
      "Position the plate within the frame": "Position the plate within the frame",
      "Position the chassis number within the frame": "Position the chassis number within the frame",
      
      "Front of Vehicle": "Front of Vehicle",
      "Rear of Vehicle": "Rear of Vehicle",
      "Left Side": "Left Side",
      "Right Side": "Right Side",
      
      "Rotate to Landscape": "Rotate to Landscape",
      "For this photo, hold your phone horizontally": "For this photo, hold your phone horizontally",

      "Authenticating link…": "Authenticating link…",
      "Link Expired": "Link Expired",
      "This inspection link has expired. Please contact the administrator to request a new link.": "This inspection link has expired. Please contact the administrator to request a new link.",
      "Authentication Failed": "Authentication Failed",
      "We could not verify this inspection link. Please check the link or contact the administrator.": "We could not verify this inspection link. Please check the link or contact the administrator.",

      "Assessment submitted": "Assessment submitted",
      "Your vehicle inspection has been received and is under review.": "Your vehicle inspection has been received and is under review.",
      "Submitting…": "Submitting…",
      "Complete": "Complete",

      // Windshield
      "Wind Shield Crack Assessment": "Wind Shield Crack\nAssessment",
      "Take photos of your car's windshield crack for immediate AI analysis.": "Take photos of your car's windshield crack for immediate AI analysis.",
      "Windshield with Plate": "Windshield with Plate",
      "Windshield Damage Closeup": "Windshield Damage Closeup",
      "Hold landscape — capture full windshield with plate visible": "Hold landscape — capture full windshield with plate visible",
      "Move closer — fill the frame with the damaged area": "Move closer — fill the frame with the damaged area",
      "Clear & well-lit images": "Clear & well-lit images",
      "Include license plate in 1 photo": "Include license plate in 1 photo",
      "Wait for AI processing": "Wait for AI processing",
      "AI detects damage instantly": "AI detects damage instantly",
      "Submit photos for instant analysis": "Submit photos for instant analysis",
      "Secure damage assessment": "Secure damage assessment",

      // Missing
      "Add damage photos?": "Add damage photos?",
      "You can add any number of additional photos showing specific damage, interior, or other details to strengthen your claim.": "You can add any number of additional photos showing specific damage, interior, or other details to strengthen your claim.",
      "Required Photos": "Required Photos",
      "Vehicle Side Photos": "Vehicle Side Photos",
      "Additional Photos": "Additional Photos",
      "Additional Photo": "Additional Photo",
      "Add": "Add",
      "Another": "Another",
      "Photo": "Photo",
      "Review & Submit": "Review & Submit",
      "No additional photos — you can still submit": "No additional photos — you can still submit",
      "additional photo": "additional photo",
      "added": "added",
      "photo": "photo",
      "total": "total",
      "required": "required",
      "additional": "additional",
      "Submission Successful": "Submission Successful",
      "Your claim has been submitted successfully. Our team will review and contact you shortly.": "Your claim has been submitted successfully. Our team will review and contact you shortly.",
      "Required Photos Done": "Required Photos Done",
      "of": "of",
      "captured": "captured",
      "Capture any additional damage or details": "Capture any additional damage or details",
      "Add More Photos": "Add More Photos",
      "Capture Additional Photo": "Capture Additional Photo",
      
      // Windshield new
      "Windshield Claim": "Windshield Claim",
      "Windshield Damage Inspection": "Windshield Damage\nInspection",
      "Capture your vehicle details and windshield damage photos to process your claim quickly": "Capture your vehicle details and windshield damage photos to process your claim quickly",
      "License plate & chassis number photos": "License plate & chassis number photos",
      "Full windshield with plate visible": "Full windshield with plate visible",
      "Close-up of the damaged area": "Close-up of the damaged area",
      "Ensure good lighting — natural daylight is best": "Ensure good lighting — natural daylight is best",
      "Keep the full windshield in frame": "Keep the full windshield in frame",
      "Get close enough to show crack or chip details": "Get close enough to show crack or chip details",
      "Make sure the license plate is readable": "Make sure the license plate is readable",
      "Don't shoot with glare or reflections on glass": "Don't shoot with glare or reflections on glass",
      "Don't obscure the damage with your hand": "Don't obscure the damage with your hand",
      "Don't submit blurry close-up shots": "Don't submit blurry close-up shots",
      "Follow these guidelines for the best claim results.": "Follow these guidelines for the best claim results.",
      "We need camera and GPS permissions to capture and geo-tag your windshield photos.": "We need camera and GPS permissions to capture and geo-tag your windshield photos.",
      "Hold your phone horizontally to capture the photo": "Hold your phone horizontally to capture the photo",
      "Got It": "Got It",
      "Plate must be visible": "Plate must be visible",
      "Move in close — fill frame with the crack or chip": "Move in close — fill frame with the crack or chip",
      "Vehicle Documents": "Vehicle Documents",
      "Windshield Photos": "Windshield Photos",
      "Windshield": "Windshield",
      "Ensure all photos are clear before submitting": "Ensure all photos are clear before submitting",
      "Submit Claim": "Submit Claim"
    }
  },
  ar: {
    translation: {
      "Start Assessment": "بدء التقييم",
      "Next": "التالي",
      "Got It — Continue": "فهمت — استمرار",
      "Upload Image": "رفع الصورة",
      "Capture": "التقاط",
      "Retake": "إعادة التقاط",
      "Retake All Photos": "إعادة التقاط جميع الصور",
      "Submit Assessment": "إرسال التقييم",
      "Done": "تم",
      "Review Your Photos": "راجع صورك",
      "Make sure all vehicle sides are clearly visible": "تأكد من أن جميع جوانب السيارة مرئية بوضوح",

      // Preclaim / Motor
      "Pre Claim Policy Inspection": "فحص وثيقة\nما قبل المطالبة",
      "Motor Claim Inspection": "فحص مطالبة\nالسيارات",
      "Take photos of your vehicle from all four sides for inspection": "التقط صوراً لمركبتك من الجوانب الأربعة للفحص",
      "6 photos required: plate, chassis & 4 sides": "مطلوب 6 صور: اللوحة، الشاسيه، و4 جوانب",
      "GPS location will be recorded": "سيتم تسجيل موقع GPS",
      "Securely submitted for assessment": "مقدم بآمان للتقييم",
      
      "Photo Tips – Do's": "نصائح الصور – ما يجب فعله",
      "Photo Tips – Don'ts": "نصائح الصور – ما لا يجب فعله",
      "Follow these guidelines for the best results.": "اتبع هذه الإرشادات للحصول على أفضل النتائج.",
      "Ensure good lighting conditions": "تأكد من ظروف الإضاءة الجيدة",
      "Keep the vehicle within the frame guide": "أبقِ السيارة داخل دليل الإطار",
      "Take photos from a reasonable distance": "التقط الصور من مسافة مناسبة",
      "Ensure the entire vehicle is visible": "تأكد من ظهور السيارة بأكملها",
      "Don't shoot in direct harsh sunlight": "لا تصور في أشعة الشمس المباشرة القوية",
      "Don't cut off parts of the vehicle": "لا تقطع أجزاء من السيارة",
      "Don't use blurry or shaky photos": "لا تستخدم صوراً ضبابية أو مهتزة",

      "Turn Off Auto-Rotation": "إيقاف التدوير التلقائي",
      "Before we begin, please turn off your phone's auto-rotation feature.": "قبل أن نبدأ، يرجى إيقاف ميزة التدوير التلقائي في هاتفك.",
      "This ensures the camera stays in the correct orientation while you take photos.": "هذا يضمن بقاء الكاميرا في الاتجاه الصحيح أثناء التقاط الصور.",

      "Allow Access": "السماح بالوصول",
      "We need camera and GPS permissions to capture and geo-tag your vehicle photos.": "نحتاج أذونات الكاميرا وموقع GPS لالتقاط صور مركبتك وتسجيل موقعها.",
      "Grant Permissions": "منح الأذونات",
      "Camera permission denied. Please allow camera access in your browser settings.": "تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا في إعدادات متصفحك.",
      "Requesting permissions…": "جاري طلب الأذونات...",
      "Camera": "الكاميرا",
      "Location": "الموقع",

      "License Plate": "لوحة السيارة",
      "Chassis Number": "رقم الشاسيه",
      "Position the plate within the frame": "ضع اللوحة داخل الإطار",
      "Position the chassis number within the frame": "ضع رقم الشاسيه داخل الإطار",
      
      "Front of Vehicle": "مقدمة السيارة",
      "Rear of Vehicle": "مؤخرة السيارة",
      "Left Side": "الجانب الأيسر",
      "Right Side": "الجانب الأيمن",
      
      "Rotate to Landscape": "التدوير للوضع الأفقي",
      "For this photo, hold your phone horizontally": "لهذه الصورة، احمل هاتفك بشكل أفقي",

      "Authenticating link…": "جاري مصادقة الرابط...",
      "Link Expired": "الرابط منتهي الصلاحية",
      "This inspection link has expired. Please contact the administrator to request a new link.": "صلاحية رابط الفحص هذا قد انتهت. يرجى الاتصال بالمسؤول لطلب رابط جديد.",
      "Authentication Failed": "فشلت المصادقة",
      "We could not verify this inspection link. Please check the link or contact the administrator.": "لم نتمكن من التحقق من رابط الفحص هذا. يرجى التحقق من الرابط أو الاتصال بالمسؤول.",

      "Assessment submitted": "تم إرسال التقييم",
      "Your vehicle inspection has been received and is under review.": "تم استلام فحص مركبتك وهو الآن قيد المراجعة.",
      "Submitting…": "جاري الإرسال...",
      "Complete": "مكتمل",

      // Windshield
      "Wind Shield Crack Assessment": "تقييم كسر الزجاج\nالأمامي",
      "Take photos of your car's windshield crack for immediate AI analysis.": "التقط صوراً لكسر الزجاج الأمامي لسيارتك للتحليل الفوري بواسطة الذكاء الاصطناعي.",
      "Windshield with Plate": "الزجاج الأمامي مع اللوحة",
      "Windshield Damage Closeup": "صورة مقربة لضرر الزجاج",
      "Hold landscape — capture full windshield with plate visible": "احمله أفقياً — التقط الزجاج الأمامي كاملاً مع ظهور اللوحة",
      "Move closer — fill the frame with the damaged area": "اقترب — املأ الإطار بالمنطقة المتضررة",
      "Clear & well-lit images": "صور واضحة وجيدة الإضاءة",
      "Include license plate in 1 photo": "تضمين لوحة السيارة في صورة واحدة",
      "Wait for AI processing": "انتظر معالجة الذكاء الاصطناعي",
      "AI detects damage instantly": "الذكاء الاصطناعي يكتشف الضرر فوراً",
      "Submit photos for instant analysis": "إرسال الصور للتحليل الفوري",
      "Secure damage assessment": "تقييم آمن للأضرار",

      // Missing
      "Add damage photos?": "هل في أي صور أضرار تبي تضيفها؟",
      "You can add any number of additional photos showing specific damage, interior, or other details to strengthen your claim.": "تقدر تضيف أي عدد من الصور الإضافية إلي تبين ضرر معين أو تفاصيل داخلية للسيارة أو أشياء ثانية عشان تدعم مطالبتك.",
      "Required Photos": "الصور المطلوبة",
      "Vehicle Side Photos": "صور جوانب المركبة",
      "Additional Photos": "صور إضافية",
      "Additional Photo": "صورة إضافية",
      "Add": "إضافة",
      "Another": "أخرى",
      "Photo": "صورة",
      "Review & Submit": "مراجعة وإرسال",
      "No additional photos — you can still submit": "مافي صور إضافية — تقدر مع ذلك ترسل التقييم",
      "additional photo": "صورة إضافية",
      "added": "مضافة",
      "photo": "صور",
      "total": "إجمالي",
      "required": "مطلوب",
      "additional": "إضافي",
      "Submission Successful": "تم الإرسال بنجاح",
      "Your claim has been submitted successfully. Our team will review and contact you shortly.": "مطالبتك تم تقديمها بنجاح. فريقنا راح يراجعها ويتواصل معاك قريب.",
      "Required Photos Done": "تم الصور المطلوبة",
      "of": "من",
      "captured": "ملتقطة",
      "Capture any additional damage or details": "صور أي أضرار أو تفاصيل إضافية",
      "Add More Photos": "إضافة صور أكثر",
      "Capture Additional Photo": "التقاط صورة إضافية",

      // Windshield new
      "Windshield Claim": "مطالبة الزجاج الأمامي",
      "Windshield Damage Inspection": "فحص أضرار\nالزجاج الأمامي",
      "Capture your vehicle details and windshield damage photos to process your claim quickly": "التقط تفاصيل سيارتك وصور أضرار الزجاج الأمامي عشان نقدر نعالج مطالبتك بسرعة",
      "License plate & chassis number photos": "صور لوحة السيارة ورقم الشاسيه",
      "Full windshield with plate visible": "الزجاج الأمامي كامل مع ظهور اللوحة بوضوح",
      "Close-up of the damaged area": "صورة عن قرب للمكان المتضرر",
      "Ensure good lighting — natural daylight is best": "تأكد من إضاءة زينة — الإضاءة الطبيعية أحسن شيء",
      "Keep the full windshield in frame": "خل الزجاج الأمامي كامل يبين بالصورة",
      "Get close enough to show crack or chip details": "قرب زين عشان تبين تفاصيل الكسر أو الخدش",
      "Make sure the license plate is readable": "تأكد إن لوحة السيارة تتقرأ",
      "Don't shoot with glare or reflections on glass": "لا تصور وفي انعكاسات قوية أو لمعة على الزجاج",
      "Don't obscure the damage with your hand": "لا تغطي الضرر بيدك",
      "Don't submit blurry close-up shots": "لا تقدم صور قريبة مو واضحة",
      "Follow these guidelines for the best claim results.": "اتبع هذي التعليمات عشان أفضل نتيجة لمطالبتك.",
      "We need camera and GPS permissions to capture and geo-tag your windshield photos.": "نحتاج أذونات الكاميرا وموقع GPS عشان نصور ونسجل موقع صور הזجاج الأمامي.",
      "Hold your phone horizontally to capture the photo": "امسك تلفونك بالعرض عشان تصور الصورة",
      "Got It": "فهمت",
      "Plate must be visible": "لازم اللوحة تكون واضحة",
      "Move in close — fill frame with the crack or chip": "قرب حيل — خل الكسر أو الخدش ياخذ مساحة الصورة",
      "Vehicle Documents": "وثائق المركبة",
      "Windshield Photos": "صور الزجاج الأمامي",
      "Windshield": "الزجاج الأمامي",
      "Ensure all photos are clear before submitting": "تأكد من وضوح كل الصور قبل لا ترسل",
      "Submit Claim": "إرسال المطالبة"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
