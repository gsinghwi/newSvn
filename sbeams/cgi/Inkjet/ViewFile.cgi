#!/usr/local/bin/perl

###############################################################################
# Set up all needed modules and objects
###############################################################################
use strict;
use Getopt::Long;
use FindBin;

use lib qw (../lib/perl ../../lib/perl);

use vars qw ($sbeams $sbeamsMOD $q $dbh $current_contact_id $current_username
             $PROG_NAME $USAGE %OPTIONS $QUIET $VERBOSE $DEBUG $DATABASE
             $current_work_group_id $current_work_group_name
             $current_project_id $current_project_name
             $TABLE_NAME $PROGRAM_FILE_NAME $CATEGORY $DB_TABLE_NAME
             $PK_COLUMN_NAME @MENU_OPTIONS);
#use CGI;
use CGI::Carp qw(fatalsToBrowser croak);

use SBEAMS::Connection qw($q);
use SBEAMS::Connection::Settings;
use SBEAMS::Connection::Tables;
use SBEAMS::Connection::TableInfo;
#$q = new CGI;
$sbeams = new SBEAMS::Connection;

use SBEAMS::Inkjet;
use SBEAMS::Inkjet::Settings;
use SBEAMS::Inkjet::Tables;
use SBEAMS::Inkjet::TableInfo;
$sbeamsMOD = new SBEAMS::Inkjet;

$sbeamsMOD->setSBEAMS($sbeams);
$sbeams->setSBEAMS_SUBDIR($SBEAMS_SUBDIR);


###############################################################################
# Set program name and usage banner for command like use
###############################################################################
$PROG_NAME = $FindBin::Script;
$USAGE = <<EOU;
Usage: $PROG_NAME 
Options:
  --verbose n         Set verbosity level.  default is 0
  --quiet             Set flag to print nothing at all except errors
  --debug n           Set debug flag

 e.g.:  $PROG_NAME [OPTIONS] [keyword=value],...

EOU

#### Process options
unless (GetOptions(\%OPTIONS,"verbose:s","quiet","debug:s")) {
  print "$USAGE";
  exit;
}

$VERBOSE = $OPTIONS{"verbose"} || 0;
$QUIET = $OPTIONS{"quiet"} || 0;
$DEBUG = $OPTIONS{"debug"} || 0;
if ($DEBUG) {
  print "Options settings:\n";
  print "  VERBOSE = $VERBOSE\n";
  print "  QUIET = $QUIET\n";
  print "  DEBUG = $DEBUG\n";
}



###############################################################################
# Set Global Variables and execute main()
###############################################################################

my $FILE_BASE_DIR = "/net/arrays/Pipeline/output/project_id";
my $DOC_BASE_DIR = "";
my $DATA_READER_ID = 40;

main();
exit(0);



###############################################################################
# Main Program:
#
# Call $sbeams->InterfaceEntry with pointer to the subroutine to execute if
# the authentication succeeds.
###############################################################################
sub main {

  #### Do the SBEAMS authentication and exit if a username is not returned
  exit unless ($current_username = $sbeams->Authenticate(
    #connect_read_only=>1,
    #allow_anonymous_access=>1,
    #permitted_work_groups_ref=>['Proteomics_user','Proteomics_admin'],
  ));

  #### Read in the default input parameters
  my %parameters;
  my $n_params_found = $sbeams->parse_input_parameters(
    q=>$q,parameters_ref=>\%parameters);
  #$sbeams->printDebuggingInfo($q);

  #### Define standard variables
  my $file_name = $parameters{'FILE_NAME'}
  || die "ERROR: file not passed";
	my $action =$parameters{'action'} || "download";
	my $project_id = $sbeams->getCurrent_project_id;

	my $output_dir;
	if ($file_name =~ /\.map$/ || $file_name=~/\.key$/) {
	    $output_dir = "/net/arrays/Slide_Templates";
	}elsif ($file_name =~/\.doc/){
	    $output_dir = "/net/"
	}else {
	    $output_dir = "$FILE_BASE_DIR/$project_id";
	}

	if ($action eq 'download') {
	    #### Verify user has permission to access the file
	    if ($sbeams->get_best_permission <= $DATA_READER_ID){
		print "Content-type: application/force-download \n";
		print "Content-Disposition: filename=$file_name\n\n";
		my $buffer;
		open (DATA, "$output_dir/$file_name")
		    || die "Couldn't open $file_name";
		while(read(DATA, $buffer, 1024)) {
		    print $buffer;
		}
	    }else {
		$sbeams->printPageHeader();
		print qq~
		    <BR><BR><BR>
		    <H1><FONT COLOR="red">You Do Not Have Access To View This File</FONT></H1>
		    <H2><FONT COLOR="red">Contact PI or another administrator for permission</FONT></H2>
		    ~;
		$sbeamsMOD->printPageFooter();
	    }
	}else {
	    #### Start printing the page
	    $sbeamsMOD->printPageHeader();	
	    
	    #### Verify user has permission to access the file
	    if ($sbeams->get_best_permission <= $DATA_READER_ID){
		my $file = "$output_dir/$file_name";
		printFile(file=>$file);
	    }
	    else{
		print qq~
		    <BR><BR><BR>
		    <H1><FONT COLOR="red">You Do Not Have Access To View This File</FONT></H1>
		    <H2><FONT COLOR="red">Contact PI or another administrator for permission</FONT></H2>
		    ~;
	    }
	    $sbeamsMOD->printPageFooter();
	}
} # end main

###############################################################################
# printFile
#
# A very simple script.  Throw the contents of the file within <PRE> tags and
# we're done
###############################################################################
sub printFile {
  my %args = @_;

  my $file = $args{'file'};
  my $error = 0;

  open(INFILE, "< $file") || sub{$error = -1;};

  if ($error == 0) {
      print qq~ <PRE> ~;
      while (<INFILE>) {
	  print qq~ $_ ~;
      }
      print qq~ </PRE>~;
  }
  else{
      print qq~
	  $file
	  <CENTER><FONT COLOR="red"><h1><B>FILE COULD NOT BE OPENED FOR VIEWING</B></h1>
	  Please report this to <a href="mailto:mailto:mjohnson\@systemsbiology.org">Michael Johnson</a>
	  </FONT></CENTER>
      ~;
  }
	  
} # end printFile


