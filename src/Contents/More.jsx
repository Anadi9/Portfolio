import React from 'react';
import ReviewBox from './ReviewBox';
import { FacebookIcon, InstagramIcon, GmailIcon, GithubIcon, LinkedinIcon } from './Icons';


function More(props) {
    return (
        <div>
            <h1 className="text-success">More</h1><br/>
            <ReviewBox/><br/>
            <div className="">
            <h5 className="text-info">Contact</h5>
            <p className="badge text-white"><span role="img" aria-label="">📞</span>+91 74669 14279</p><br/>
            <p className="badge text-danger"><GmailIcon/>  anadithakur99@gmail.com</p><br/>
            <div>
            <a href="https://www.facebook.com/anadi.thakur.3"><FacebookIcon/></a>
            <a href="https://www.instagram.com/anadi_thakur_9"><InstagramIcon/></a>
            <a href="https://github.com/Anadi9"><GithubIcon/></a>
            <a href="https://www.linkedin.com/in/anadi-thakur-92163316b"><LinkedinIcon/></a>
            </div>
            </div>
        </div>
    );
}

export default More;