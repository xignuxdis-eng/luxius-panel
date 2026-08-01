export function clearOrdersData() {
    console.log('Clearing all orders data...');
    localStorage.removeItem('luxius_session_orders');
    localStorage.removeItem('luxius_deleted_orders');
    // Also clear legacy keys just in case
    localStorage.removeItem('luxius_orders');
    console.log('Orders data cleared.');
    window.location.reload();
}
