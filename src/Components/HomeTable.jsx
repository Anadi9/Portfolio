import React from 'react';
import Profilepic from '../Images/Profilepic';
import Home from '../Contents/Home';
import { FacebookIcon, InstagramIcon, GmailIcon, GithubIcon, LinkedinIcon } from '../Contents/Icons';

function HomeTable(props) {
    return (
        <div>
        <table className="table">
          <tbody>
          <tr>
            <td><Home/></td>
            <td><Profilepic/></td>
          </tr>
          </tbody>
        </table>
        <div>
            <h5 className="text-info">Contact</h5>
            <a href="https://www.facebook.com/anadi.thakur.3"><FacebookIcon/></a>
            <a href="https://www.instagram.com/anadi_thakur_9"><InstagramIcon/></a>
            <a href="anadihakur99@gmail.com"><GmailIcon/></a>
            <a href="https://github.com/Anadi9"><GithubIcon/></a>
            <a href="https://www.linkedin.com/in/anadi-thakur-92163316b"><LinkedinIcon/></a>
            </div>
        </div>
    );
}

export default HomeTable;