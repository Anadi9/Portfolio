import React from 'react';

function Education(props) {
    return (
        <div className="col s12 m8 l9">
          <h1 className="text-success">Education</h1><br/><br/>
          <div>
          <table className="table table-sm">
            <thead className="thead-light">
               <tr>
                 <th scope="col">Degree</th>
                 <th scope="col">Institute</th>
                 <th scope="col">Session</th>
               </tr>
            </thead>
            <tbody className="text-muted">
            <tr>
            <td>Bachelor in Computer Application</td>
            <td>Graphic Era University</td>
            <td>2019-22</td>
          </tr>
          <tr>
            <td>XII Standard</td>
            <td>M.M. Public School</td>
            <td>2017-18</td>
          </tr>
            </tbody>
          </table>
          </div>
        </div>
    );
}

export default Education;