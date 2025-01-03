const servicePrices = {
    batteryReplacement: [
        { device: "iPhone 15 Pro Max", price: 135000 },
        { device: "iPhone 15 Pro", price: 135000 },
        { device: "iPhone 15 Plus", price: 135000 },
        { device: "iPhone 15", price: 135000 },
        { device: "iPhone 14 Pro Max", price: 135000 },
        { device: "iPhone 14 Pro", price: 135000 },
        { device: "iPhone 14 Plus", price: 135000 },
        { device: "iPhone 14", price: 135000 },
        { device: "iPhone 13 Pro Max", price: 105000 },
        { device: "iPhone 13 Pro", price: 105000 },
        { device: "iPhone 13", price: 105000 },
        { device: "iPhone 13 mini", price: 105000 },
        { device: "iPhone 12 Pro Max", price: 105000 },
        { device: "iPhone 12 Pro", price: 105000 },
        { device: "iPhone 12", price: 105000 },
        { device: "iPhone 12 mini", price: 105000 },
        { device: "iPhone SE (2nd generation)", price: 90000 },
        { device: "iPhone 11 Pro Max", price: 105000 },
        { device: "iPhone 11 Pro", price: 105000 },
        { device: "iPhone 11", price: 105000 },
        { device: "iPhone XS Max", price: 105000 },
        { device: "iPhone XS", price: 105000 },
        { device: "iPhone XR", price: 105000 },
        { device: "iPhone X", price: 105000 },
        { device: "iPhone 8 Plus", price: 90000 },
        { device: "iPhone 8", price: 90000 },
        { device: "iPhone 7 Plus", price: 90000 },
        { device: "iPhone 7", price: 90000 },
    ],
    rearCameraReplacement: [
        { device: "iPhone 15 Pro Max", price: 455000 },
        { device: "iPhone 15 Pro", price: 400000 },
        { device: "iPhone 15 Plus", price: 320000 },
        { device: "iPhone 15", price: 320000 },
        { device: "iPhone 14 Pro Max", price: 375000 },
        { device: "iPhone 14 Pro", price: 357000 },
        { device: "iPhone 14 Plus", price: 300000 },
        { device: "iPhone 14", price: 300000 },
        { device: "iPhone 13 Pro Max", price: 340000 },
        { device: "iPhone 13 Pro", price: 340000 },
        { device: "iPhone 13", price: 300000 },
        { device: "iPhone 13 mini", price: 300000 },
        { device: "iPhone 12 Pro Max", price: 320000 },
        { device: "iPhone 12 Pro", price: 320000 },
        { device: "iPhone 12", price: 285000 },
        { device: "iPhone 12 mini", price: 285000 },
        { device: "iPhone SE (2nd generation)", price: 145000 },
        { device: "iPhone 11 Pro Max", price: 215000 },
        { device: "iPhone 11 Pro", price: 215000 },
        { device: "iPhone 11", price: 165000 },
        { device: "iPhone XS Max", price: 165000 },
        { device: "iPhone XS", price: 165000 },
        { device: "iPhone XR", price: 165000 },
        { device: "iPhone X", price: 165000 },
        { device: "iPhone 8 Plus", price: 165000 },
        { device: "iPhone 8", price: 145000 },
        { device: "iPhone 7 Plus", price: 165000 },
        { device: "iPhone 7", price: 145000 },
    ],
    frontCameraReplacement: [
        { device: "iPhone 15 Pro Max", price: 465000 },
        { device: "iPhone 15 Pro", price: 415000 },
        { device: "iPhone 15 Plus", price: 465000 },
        { device: "iPhone 15", price: 415000 },
        { device: "iPhone 14 Pro Max", price: 435000 },
        { device: "iPhone 14 Pro", price: 375000 },
        { device: "iPhone 14 Plus", price: 435000 },
        { device: "iPhone 14", price: 395000 },
        { device: "iPhone 13 Pro Max", price: 420000 },
        { device: "iPhone 13 Pro", price: 375000 },
        { device: "iPhone 13", price: 375000 },
        { device: "iPhone 13 mini", price: 340000 },
        { device: "iPhone 12 Pro Max", price: 275000 },
        { device: "iPhone 12 Pro", price: 275000 },
        { device: "iPhone 12", price: 275000 },
        { device: "iPhone 12 mini", price: 275000 },
        { device: "iPhone 11 Pro Max", price: 275000 },
        { device: "iPhone 11 Pro", price: 275000 },
        { device: "iPhone 11", price: 275000 },
        { device: "iPhone XS Max", price: 275000 },
        { device: "iPhone XS", price: 275000 },
        { device: "iPhone XR", price: 275000 },
        { device: "iPhone X", price: 275000 },
    ],
    backGlassReplacement: [
        { device: "iPhone 15 Pro Max", price: 360000 },
        { device: "iPhone 15 Pro", price: 320000 },
        { device: "iPhone 15 Plus", price: 360000 },
        { device: "iPhone 15", price: 320000 },
        { device: "iPhone 14 Plus", price: 340000 },
        { device: "iPhone 14", price: 300000 },
    ],
};

// Example: Accessing a specific price
function getServicePrice(serviceType, deviceName) {
    const serviceList = servicePrices[serviceType];
    if (!serviceList) {
        return "Service type not found.";
    }
    const service = serviceList.find(item => item.device === deviceName);
    return service ? `${service.price} IQD` : "Device not found.";
}

export default getServicePrice;