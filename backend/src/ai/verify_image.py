import sys
import json
import os


def check_image_authenticity(image_path):
    # 1. Check if file exists or is empty
    if not image_path or not os.path.exists(image_path):
        return {"is_appropriate": False, "is_ai_generated": False}
    
    # 2. Simple placeholder AI / appropriateness heuristic
    filename = os.path.basename(image_path).lower()
    is_ai = "generated" in filename or "fake" in filename

    return {
        "is_appropriate": True,
        "is_ai_generated": is_ai
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(json.dumps(check_image_authenticity(sys.argv[1])))
    else:
        print(json.dumps({"is_appropriate": False, "is_ai_generated": False}))
