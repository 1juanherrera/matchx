const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://35.243.241.205:8082/api/login', { username: 'luis@matchx.com', password: 'password' });
    console.log(res.data);
  } catch (e) {
    console.error(e.response?.data || e.message);
  }
}
test();
