import { UniversalAccount } from '@particle-network/universal-account-sdk';
import { Wallet } from 'ethers';
import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3000';
const token = jwt.sign(
  {
    sub: '358801635322889216',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 1,
  },
  'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
);

const authHeader = {
  Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNTg4MDE2MzUzMjI4ODkyMTYiLCJuaWNrbmFtZSI6IkppbGxpYW4iLCJpYXQiOjE3NjQ4NjI0NjgsImV4cCI6MTc2NTQ2NzI2OH0.milxD0zKDHdLQtpSAJX_o_4PvLgsbOGftsSx4F0dqEs`,
  'Content-Type': 'application/json',
};

console.log(authHeader);

const run = async () => {
  const response = await fetch(`${endpoint}/api/v1/campaigns/2`, {
    method: 'GET',
    headers: authHeader,
  });
  const data = await response.json();
  console.log(data);

  // get task by campaign id
  // const taskResponse = await fetch(
  //   `${endpoint}/api/v1/campaigns/${data.campaigns[1].id}/tasks`,
  //   {
  //     method: 'GET',
  //     headers: authHeader,
  //   },
  // );
  // const taskData = await taskResponse.json();
  // console.log(taskData);

  // // participate campaign
  // const participateResponse = await fetch(
  //   `${endpoint}/api/v1/campaigns/${data.campaigns[1].id}/participate`,
  //   {
  //     method: 'POST',
  //     headers: authHeader,
  //   },
  // );
  // const participateData = await participateResponse.json();
  // console.log(participateData);

  // // complete task
  // const completeResponse = await fetch(
  //   `${endpoint}/api/v1/campaigns/tasks/7/complete`,
  //   {
  //     method: 'POST',
  //     headers: authHeader
  //   },
  // );
  // const completeData = await completeResponse.json();
  // console.log(completeData);

  // // get user task progress
  // const userTaskProgressResponse = await fetch(
  //   `${endpoint}/api/v1/campaigns/10/progress`,
  //   {
  //     method: 'GET',
  //     headers: authHeader,
  //   },
  // );
  // const userTaskProgressData = await userTaskProgressResponse.json();
  // console.log(userTaskProgressData);

  // /api/v1/assets/trading-volume
  // const tradingVolumeResponse = await fetch(
  //   `${endpoint}/api/v1/assets/trading-volume`,
  //   {
  //     method: 'GET',
  //     headers: authHeader,
  //   },
  // );
  // const tradingVolumeData = await tradingVolumeResponse.json();
  // console.log(tradingVolumeData);
};

run();
