/**
 * Copyright 2017 Huawei, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

$(function () {
  "use strict";

  horizon.modals.addModalInitFunction(conveyorPlanDestination);

  function conveyorPlanDestination(modal) {
    var destinationForm = $(modal).find('#destination_form');

    $('table#destination_az tbody tr').each(function () {
      var srcAZ = $(this).attr('data-object-id');
      var srcAZmd5 = $(this).find('td').eq(1).text();
      var destinationAZ = $(this).find('td').eq(2).find('select');
      $(destinationForm).find('[md5=' + srcAZmd5 + ']').val($(destinationAZ).val());
      $(destinationAZ).change(function () {
        $(destinationForm).find('[md5=' + srcAZmd5 + ']').val($(this).val());
      });
    });

    $(destinationForm).find('.modal-footer a.ajax-modal').click(function () {
      var az_map = [];
      $(destinationForm).find('fieldset input[md5]').each(function () {
        az_map.push(this.name + '=' + $(this).val());
      });
      var href = $(this).attr('href');
      $(this).attr('href', href.split('?')[0] + '?' + az_map.join('&&'));
    });
  }

  var destinationFormModal = $('#destination_form').parent();
  if (destinationFormModal.length) {
    conveyorPlanDestination(destinationFormModal);
  }
});
