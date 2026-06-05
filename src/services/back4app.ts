import axios from 'axios';

const APP_ID = 'dt6IU3d3agOJQsti39conHPkmmXLL7VgCAsJj9a0';
const MASTER_KEY = 'tSRsronTOHWDEKGuRpDnQJ1IlSAJ10SXt2Mi5PUR';
const SERVER_URL = 'https://parseapi.back4app.com';

const api = axios.create({
    baseURL: SERVER_URL,
    headers: {
        'X-Parse-Application-Id': APP_ID,
        'X-Parse-Master-Key': MASTER_KEY,
        'Content-Type': 'application/json'
    }
});

export async function saveWatchlistToBack4App(content: string, coinCount: number) {
    try {
        const CLASS_NAME = 'WatchlistHistory';
        
        const data = {
            timestamp: new Date().toISOString(),
            coinCount: coinCount,
            tableData: content, // Вся таблица одной строкой/текстом
        };

        const response = await api.post(`/classes/${CLASS_NAME}`, data);
        console.log(`✅ Данные успешно сохранены в Back4App. ID: ${response.data.objectId}`);
        return response.data;
    } catch (error: any) {
        console.error('❌ Ошибка при отправке в Back4App:', error.response?.data || error.message);
        throw error;
    }
}
