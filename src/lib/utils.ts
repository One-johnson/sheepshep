import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility functions for date conversion
 */
export function convertDateToTimestamp(dateString?: string): number | undefined {
  if (!dateString || dateString.trim() === "") return undefined;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date.getTime();
}

/**
 * Utility functions for error message mapping
 */
export function getUserFriendlyError(error: string): { message: string; scripture?: string } {
  const errorLower = error.toLowerCase();
  
  // Email errors
  if (errorLower.includes("email") && errorLower.includes("already exists")) {
    return {
      message: "This email is already registered. Please use a different email address.",
      scripture: "Proverbs 16:9 - 'In their hearts humans plan their course, but the Lord establishes their steps.'"
    };
  }
  
  if (errorLower.includes("invalid email")) {
    return {
      message: "Please enter a valid email address.",
      scripture: "Proverbs 18:13 - 'To answer before listening—that is folly and shame.'"
    };
  }
  
  // Authorization errors
  if (errorLower.includes("unauthorized")) {
    return {
      message: "You don't have permission to perform this action.",
      scripture: "Matthew 7:6 - 'Do not give dogs what is sacred; do not throw your pearls to pigs.'"
    };
  }
  
  // Not found errors
  if (errorLower.includes("not found")) {
    return {
      message: "The requested resource could not be found.",
      scripture: "Ecclesiastes 3:1 - 'There is a time for everything, and a season for every activity under the heavens.'"
    };
  }
  
  // Validation errors
  if (errorLower.includes("required") || errorLower.includes("missing")) {
    return {
      message: "Please fill in all required fields.",
      scripture: "Proverbs 27:23 - 'Be sure you know the condition of your flocks, give careful attention to your herds.'"
    };
  }
  
  // Password errors
  if (errorLower.includes("password")) {
    return {
      message: "Password must be at least 8 characters long.",
      scripture: "Psalm 91:1 - 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty.'"
    };
  }
  
  // Relationship errors (shepherd-bacenta, etc.)
  if (errorLower.includes("assigned") || errorLower.includes("belong")) {
    return {
      message: "The selected shepherd is not assigned to the selected bacenta. Please assign the shepherd to the bacenta first.",
      scripture: "1 Corinthians 12:12 - 'Just as a body, though one, has many parts, but all its many parts form one body, so it is with Christ.'"
    };
  }
  
  // Registration request errors
  if (errorLower.includes("pending") || errorLower.includes("registration request")) {
    return {
      message: "A registration request is already pending for this email. Please wait for approval.",
      scripture: "Psalm 27:14 - 'Wait for the Lord; be strong and take heart and wait for the Lord.'"
    };
  }
  
  // Default error
  return {
    message: error,
    scripture: "Proverbs 3:5-6 - 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.'"
  };
}

/**
 * Scripture references for success messages
 */
export const SUCCESS_SCRIPTURES = {
  userCreated: "Matthew 25:21 - 'Well done, good and faithful servant! You have been faithful with a few things; I will put you in charge of many things.'",
  memberCreated: "2 Corinthians 6:17 - 'Therefore, \"Come out from them and be separate, says the Lord. Touch no unclean thing, and I will receive you.\"'",
  shepherdCreated: "1 Peter 5:2 - 'Be shepherds of God's flock that is under your care, watching over them—not because you must, but because you are willing.'",
  pastorCreated: "Ephesians 4:11-12 - 'So Christ himself gave the apostles, the prophets, the evangelists, the pastors and teachers, to equip his people for works of service.'",
  updated: "Philippians 1:6 - 'Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus.'",
  deleted: "Ecclesiastes 3:1 - 'There is a time for everything, and a season for every activity under the heavens.'",
  uploaded: "Psalm 139:14 - 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.'",
  assigned: "1 Corinthians 12:18 - 'But in fact God has placed the parts in the body, every one of them, just as he wanted them to be.'",
  csvImported: "Proverbs 27:23 - 'Be sure you know the condition of your flocks, give careful attention to your herds.'"
};

/**
 * Scripture references for error messages
 */
export const ERROR_SCRIPTURES = {
  unauthorized: "Matthew 7:6 - 'Do not give dogs what is sacred; do not throw your pearls to pigs.'",
  validation: "Proverbs 27:23 - 'Be sure you know the condition of your flocks, give careful attention to your herds.'",
  notFound: "Ecclesiastes 3:1 - 'There is a time for everything, and a season for every activity under the heavens.'",
  duplicate: "Proverbs 16:9 - 'In their hearts humans plan their course, but the Lord establishes their steps.'",
  network: "Proverbs 3:5-6 - 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.'",
  upload: "Psalm 91:1 - 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty.'"
};
