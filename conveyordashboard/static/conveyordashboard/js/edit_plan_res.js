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
"use strict";

function redraw(url){
  var deps = '{}';
  if($('input#id_dependencies').length){deps=$('input#id_dependencies').val();}
  var arr = url.split('?');
  var loca = arr[0];
  var param = arr[1];
  var postdata = {"deps": deps,
          "param": param};
  $.ajaxSetup({beforeSend: function(xhr, settings){xhr.setRequestHeader("X-CSRFToken", $.cookie('csrftoken'));}});
  jQuery.post(loca, postdata,function(json){
    update_topo(json);
  });
}

function showTopology(){
	$("#resource_info_box").hide();
	$("#conveyor_plan_topology").show();
	$("#thumbnail").show();
}

var conveyorEditPlanRes = {
  /* Tag for HTML element */
  tag_table_info: "div#resource_info_box",
  tag_detailinfo_div: "div.detailInfoCon",
  tag_update_resource: "input#id_update_resource",
  tag_updated_resources: "input#id_updated_resources",
  tag_dependencies: "input#id_dependencies",
  tag_plan_id: "input#id_plan_id",
  tag_is_original: "div#is_original",
  /* properties */
  isUpdating: false,
  nodeClick: function (node) {
    var self = this;
    this.clearEditing();
    var node_id = $(node).attr("node_id");
    var node_type = $(node).attr("node_type");
    var plan_id = $(this.tag_plan_id).val();
    var is_original = $(this.tag_is_original).attr("data-is_original");
    var update_data = this.getUpdateResource(node_type, node_id);
    var updated_res = $(this.tag_updated_resources).val();
    var postdata = {
      "plan_id": plan_id,
      "resource_type": node_type,
      "resource_id": node_id,
      "update_data": JSON.stringify(update_data),
      "updated_res": updated_res,
      "is_original": is_original
    };
    var data = conveyorService.getResourceDetail(postdata);
    if(! data) {
      return false;
    }
    $("image#" + node_id).attr("href", data.image);
    var click_img = data.image;
    if(click_img != "") {
      var img_node = $("image[id=image_" + node_id + "]");
      img_node.attr("ori-href", img_node.attr("href"));
      img_node.attr({"href": click_img, "editing": true});
    }
    if(data.data.indexOf("form-group")>-1){
      if($('.conveyor-overview').length) {
        self.overviewPopResEditModal(node_type, node_id, data.data);
      } else {
        $("#resource_info_box").html(data.data).css("display", "block");
        $("#conveyor_plan_topology").hide();
        $("#thumbnail").hide();
        $("#stack_box").hide();
      }
    }
    $("select[name='networks'],select[name='routers'],select[name='subnets'],select[name='secgroups'],select[name='volumes'],select[name='volumetypes']").parent().parent().css({
        'display':'none'
    });

    $("#id_from_other").parent().click(function(){
        if($("#id_from_other").is(':checked')){
            $("select[name='networks'],select[name='routers'],select[name='subnets'],select[name='secgroups'],select[name='volumes'],select[name='volumetypes']").parent().parent().css({
                'display':'block'
            });
        }else{
            $("select[name='networks'],select[name='routers'],select[name='subnets'],select[name='secgroups'],select[name='volumes'],select[name='volumetypes']").parent().parent().css({
                'display':'none'
            });
        }
    });
  },
  clearEditing: function () {
    $("image[editing=true]").each(function(){
      $(this).attr({"href": $(this).attr("ori-href"), "editing": false});
    });
  },
  getUpdateResource: function (resType, resId) {
    var resources = $.parseJSON($(this.tag_update_resource).val());
    for(var index in resources) {
      var res = resources[index];
      if(res.resource_type === resType && res.resource_id === resId) {
        return res;
      }
    }
    return {};
  },
  hideTableInfo: function () {
    $(this.tag_table_info).html("");
    $(this.tag_table_info).css("display", "none");
    $("#conveyor_plan_topology").show();
    $("#thumbnail").show();
    this.clearEditing();
    return false;
  },
  saveTableInfo: function () {
    var self = this;
    try {
      if(self.isUpdating){return false;}
      self.isUpdating = true;
      var resource_type = $(self.tag_detailinfo_div).attr("resource_type");
      var resource_id = $(self.tag_detailinfo_div).attr("resource_id");
      var result = conveyorResources.processs(resource_type, resource_id);
      var data = result.data;
      if(Object.keys(data).length){
        data['resource_type'] = resource_type;
        data['resource_id'] = resource_id;
        if(result.needPosted){
          self.resChanged(resource_type, resource_id, data);
        } else {
          self.updateResourceName(resource_id, data);
          self.saveChangedInfo(resource_type, resource_id, data);
        }
      }
      $(self.tag_table_info).html("");
      $(self.tag_table_info).css("display", "none");
      self.clearEditing();
      $("#conveyor_plan_topology").show();
      $("#thumbnail").show();
      $("#info_box").show().css({"display": "block"});
      $("#stack_box").show().css({"display": "block"});
      return false;
    } catch(err){
      console.log(err);
      return false;
    } finally{
      self.isUpdating = false;
    }
  },
  /* In dashboard, change resource's some propertity, them submit it to backend to resolve.
   * params:
   * resType:	resource type in plan. like OS::Nova::Server.
   * resId:		resource id in plan. like server_0.
   * data:		data changed to resource.
   * */
  resChanged: function (resType, resId, data) {
    var self = this;
    var plan_id = $(self.tag_plan_id).val();
    var updated_resources = $(self.tag_updated_resources).val();
    var dependencies = $(self.tag_dependencies).val();
    var update_resource = $(self.tag_update_resource).val();
    $.ajaxSetup({beforeSend: function(xhr, settings){xhr.setRequestHeader("X-CSRFToken", $.cookie('csrftoken'));}});
    var postdata = {
      "plan_id": plan_id,
      "resource_type": resType,
      "resource_id": resId,
      "updated_resources": updated_resources,
      "dependencies": dependencies,
      "update_res": update_resource,
      "data": JSON.stringify(data)
    };
    var result = conveyorService.updatePlanResourceForFrontend(plan_id, postdata);
    if(result) {
      update_topo($.parseJSON(result.d3_data));
      self.updatePlanDeps(result.res_deps);
      for(var index in result.update_resources) {
        var item = result.update_resources[index];
        self.saveChangedInfo(item.resource_type,item.resource_id, item);
      }
      $(self.tag_updated_resources).val(JSON.stringify(result.updated_resources));
      $(self.tag_dependencies).val(JSON.stringify(result.dependencies));
    }
  },
  saveChangedInfo: function (resType, resId, data) {
    var self = this;
    var data_from = $(self.tag_update_resource).val();
    data_from = $.parseJSON(data_from);
    for(var index in data_from) {
      var update_res = data_from[index];
      if(update_res.resource_type === resType && update_res.resource_id === resId) {
        conveyorUtil.merge(update_res, data);
        $(self.tag_update_resource).val(JSON.stringify(data_from));
        return;
      }
    }
    data_from.push(data);
    $(self.tag_update_resource).val(JSON.stringify(data_from));
  },
  updatePlanDeps: function(planDeps) {
    var self = this;
    var plan_deps_table = $(planDeps).find('#plan_deps');
    var deps_types = [];
    $(plan_deps_table).find('tbody tr').each(function () {
      var type=$(this).find('td:eq(3)').html();
      if(deps_types.toString().indexOf(type)==-1){
        deps_types.push(type);
      }
    });
    for(var i=0;i<deps_types.length;i++){
      $(plan_deps_table).find('tbody').prepend("<tr id='node--2-"+(i+1)+"' class='parent'><td colspan='5'>"+deps_types[i]+"</td></tr>");
      $(plan_deps_table).find('tbody tr').each(function (){
        if($(this).find('td:eq(3)').html()==deps_types[i]){
          $(this).addClass("child-of-node--2-"+(i+1));
          $(plan_deps_table).find('tbody tr#node--2-'+(i+1)).after($(this));
        }
      });
    }
    $("#plan_deps").find('tbody').html($(plan_deps_table).find('tbody').html());
    self.configLocalTopology();
  },
  configLocalTopology: function (){
    var self = this;
    var plan_deps_table = $('#plan_deps_table');
    $(plan_deps_table).find('tbody tr').each(function () {
      $(this).find('td:last a').click(function () {
        if($(self.tag_table_info).length) {
          $(self.tag_table_info).hide();
        }
        showTopology();
        try{
          redraw($(this).attr('href'));
          return false
        } catch(e) {
          return false;
        }
      });
    });
    $("#plan_deps").treeTable();
  },
  updateResourceName: function (resId, data) {
    $.each(data, function (k, v) {
      if(k=='name'){
        $("#plan_deps").find('#plan_deps__row__'+resId).find('td:eq(1)').text(v);
        $("#conveyor_plan_topology .node").each(function(){
          if($(this).attr("node_id") == resId){
            var node_info = $(this).context.__data__.info_box;
            var new_info = node_info.replace(/<h3>.*<\/h3>/g,"<h3>Name:"+v+"</h3>");
            $(this).on("mouseover", function(){
              $("#info_box").html(new_info);
            });
            $(this).on("mouseout",function(){
              $("#info_box").html("");
            });
          }
        });
      }
    });
  },
  /* For resource detail. Allow to add some items for property with type of list
   * of detail resource.
   * params:
   * seletor: 			js selector of the table being to operate.
   * type: 				the type (or name) of table. like: metadatas, rules
   * addActionSelector: js selector of the add action button.*/
  openAddOperation: function (seletor, type, addActionSelector) {
    var self = this;
    if($(addActionSelector).length){
      $(addActionSelector).click(function(){
        if(type == "metadatas"){
          if(!$(seletor).find("tr.new-row").length){
            $(seletor).find("tbody").prepend('<tr class="new-row"><td class="multi_select_column"><td class="sortable normal_column"><input name="key" class="form-control" onkeydown="if(event.keyCode==13){conveyorEditPlanRes.addMetaForServer(\'table#metadatas\')}"/></td><td class="sortable normal_column"><input name="value" class="form-control" onkeydown="if(event.keyCode==13){conveyorEditPlanRes.addMetaForServer(\'table#metadatas\')}"/></td></tr>')
          }
        }else if(type == "rules"){
          if($("form#create_security_group_rule_form").length){
            return;
          }
          var rsp = conveyorService.addRuleForFrontend($('#secgroup_wrap').attr('os_id'));
          if(rsp){
            var form = $(rsp).find("form#create_security_group_rule_form");
            $(form).append($(form).find("div.col-sm-6:first").html()).find("div.modal-body").remove();
            $(form).find("div.modal-footer").remove();
            $(form).append("<div class=\"footer\"><div class=\"cell delete\"><div class=\"cancel btn btn-danger btn-xs\">Cancel</div><div id=\"id_add_sg_rule\" onclick='conveyorEditPlanRes.addSGRuleForSG()' class=\"add-rule btn btn-danger btn-xs\">Add</div></div></div>");
            if($('.conveyor-overview').length) {
              $('.modal.edit-plan-res .modal-body').append($(form).prop("outerHTML"));
            } else {
              $("#resource_info_box div.footer").after($(form).prop("outerHTML"));
            }
            $("#id_rule_menu").trigger('change', $("#id_rule_menu").children().eq(1));
          }
          return false;
        }
      });
    }
  },
  /* For resource detail. All to delete some items for property with type of list
   * of detail resource.
   * params:
   * seletor:			js selector of the table being to operate.
   * delActionSelector: js selector of the delete action button.*/
  openDeleteOperation: function (seletor, delActionSelector) {
    if($(delActionSelector).length){
      $(delActionSelector).click(function(){
        conveyorEditPlanRes.removeTableItems(seletor, delActionSelector);return false;
      });
    }
    $(seletor).find("thead input.table-row-multi-select").click(function(){
      if ($(this).attr("checked") == "checked") {
        if($(delActionSelector).hasClass("disabled")){$(delActionSelector).removeClass("disabled");}
      } else {
        if(!$(delActionSelector).hasClass("disabled")){$(delActionSelector).addClass("disabled");}
      }
    });
    $(seletor).find("tbody input.table-row-multi-select").click(function(){
      if($(seletor).find("tbody input.table-row-multi-select").length){
        if($(delActionSelector).hasClass("disabled")){
          $(delActionSelector).removeClass("disabled");
        }
      }else{
        if(!$(delActionSelector).hasClass("disabled")){
          $(delActionSelector).addClass("disabled");
        }
      }
    });
  },
  /* Remove items for table temporary. while not delete behind
   * params:
   * selector:			the css selector of the table being to operate.
   * delActionSelector: js selector of the delete action button.*/
  removeTableItems: function (selector, delActionSelector) {
    $(selector).find("tbody tr").each(function(){
      if($(this).find("input[name=object_ids].table-row-multi-select").attr("checked")=="checked"){
        var item_id = $(this).attr("data-object-id");
        if(typeof($(selector).attr("deleted_ids"))=="undefined"){$(selector).attr("deleted_ids", item_id);}
        else{$(selector).attr("deleted_ids", $(selector).attr("deleted_ids") + " " + item_id);}
        $(this).remove();
      }
    });
    if(!$(delActionSelector).hasClass("disabled")){$(delActionSelector).addClass("disabled");}
  },
  /* For resource detail. Add an new metadata item for instance metadata property.
   * params:
   * selector: js selector of metadata table.*/
  addMetaForServer: function (selector) {
    var in_key = $(selector).find("tbody tr.new-row input[name=key]");
    var in_value = $(selector).find("input[name=value]");
    var key = $(in_key).val();
    var value = $(in_value).val();
    if(key==""){$(in_key).focus();return;}
    if(value==""){$(in_value).focus();return;}
    var row = '<tr data_from="client" data-object-id="' + key + '" id="metadatas__row__' + key + '">'
          + '<td class="multi_select_column"><input class="table-row-multi-select" name="object_ids" type="checkbox" value="' + key + '"></td>'
          + '<td class="sortable normal_column">' + key + '</td>'
          + '<td class="sortable normal_column">' + value + '</td></tr>';
    $(selector).find("tr.new-row").remove();
    $(selector).find("tbody").prepend(row);
  },
  addSGRuleForSG: function () {
    var secgroup_rule = {
      'rule_menu': $("select#id_rule_menu").val(),
      'direction': $("select#id_direction").val(),
      'ip_protocol': $("#id_ip_protocol").val(),
      'port_or_range': $("#id_port_or_range").val(),
      'port': parseInt($("#id_port").val()),
      'from_port': parseInt($("#id_from_port").val()),
      'to_port': parseInt($("#id_to_port").val()),
      'icmp_type': $("#id_icmp_type").val(),
      'icmp_code': $("#id_icmp_code").val(),
      'remote': $("#id_remote").val(),
      'cidr': $("#id_cidr").val(),
      'security_group': $("#id_security_group").val(),
      'ethertype': $("#id_ethertype").val()
    };

    var result = conveyorService.createSGRule($("#secgroup_wrap").attr('od_id'), {'secgroup_rule': JSON.stringify(secgroup_rule)});
    if(result) {
       var sgr = result.sgr;
        var sgrs_node = $("#id_sgrs");
        var ori_rs = $.parseJSON($(sgrs_node).attr("data-ori"));
        ori_rs.push(sgr);
        $(sgrs_node).attr({"data-ori": JSON.stringify(ori_rs), "changed": true});
        $("table#rules tbody").append($(result.sgr_html).find("tbody tr").prop("outerHTML"));
        $("form#create_security_group_rule_form").remove();
    }
    return false;
  },
  overviewPopResEditModal: function (resType, resId, data) {
    var hideModal = function (modal) {
      $(modal).removeAttr('style').removeClass('in').removeClass('ng-scope').find('.modal-body').html('');
      $(modal).parent().find('.modal-backdrop').remove();
      $(modal).remove();
    };
    conveyorResources.prefixCss = '.modal.edit-plan-res';
    var modal = horizon.modals.create(gettext('Edit Plan Resource: ' + resType.split('::')[2]), '', gettext('Save'));
    $(modal).parent().append('<div class="modal-backdrop  in"></div>');
    $(modal)
      .css({'top': '0px', 'display': 'block'})
      .addClass('edit-plan-res')
      .addClass('in')
      .addClass('ng-scope')
      .attr({'data-backdrop': 'static', 'aria-hidden': false})
      .find('.modal-body')
      .html(data).find('a.closeTopologyBalloon,.footer').remove();
    $(modal).find('.modal-footer .btn-primary').click(function () {
      conveyorEditPlanRes.saveTableInfo();
      hideModal(modal);
    });
    $(modal).find('.modal-footer .cancel, .modal-header .close').click(function () {
      hideModal(modal);
    });
  }
};